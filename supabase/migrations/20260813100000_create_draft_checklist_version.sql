-- Privileged draft allocation for governed Prep/Return checklist versions.
-- Authenticated roles keep SELECT-only table access; writes go through this
-- SECURITY DEFINER capability so version numbers and creation events stay atomic.

ALTER TABLE public.workshop_checklist_versions
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id)
    ON DELETE RESTRICT;

ALTER TABLE public.workshop_checklist_versions
  ADD COLUMN IF NOT EXISTS revision integer;

UPDATE public.workshop_checklist_versions
SET revision = 1
WHERE revision IS NULL;

ALTER TABLE public.workshop_checklist_versions
  ALTER COLUMN revision SET DEFAULT 1;

ALTER TABLE public.workshop_checklist_versions
  ALTER COLUMN revision SET NOT NULL;

ALTER TABLE public.workshop_checklist_versions
  DROP CONSTRAINT IF EXISTS workshop_checklist_versions_revision_positive;

ALTER TABLE public.workshop_checklist_versions
  ADD CONSTRAINT workshop_checklist_versions_revision_positive
  CHECK (revision > 0);

CREATE TABLE IF NOT EXISTS public.workshop_checklist_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  phase text NOT NULL CHECK (phase IN ('prep', 'return')),
  bike_category text NOT NULL CHECK (
    bike_category IN ('e-city', 'e-road', 'road', 'gravel', 'mtb')
  ),
  template_id uuid NOT NULL REFERENCES public.workshop_checklist_templates(id)
    ON DELETE RESTRICT,
  version_id uuid NOT NULL REFERENCES public.workshop_checklist_versions(id)
    ON DELETE RESTRICT,
  version_number integer NOT NULL CHECK (version_number > 0),
  revision integer NOT NULL CHECK (revision > 0),
  CONSTRAINT workshop_checklist_events_event_type_check
    CHECK (event_type IN ('created'))
);

CREATE INDEX IF NOT EXISTS workshop_checklist_events_version_id_idx
  ON public.workshop_checklist_events (version_id);

CREATE INDEX IF NOT EXISTS workshop_checklist_events_template_occurred_idx
  ON public.workshop_checklist_events (template_id, occurred_at);

COMMENT ON TABLE public.workshop_checklist_events IS
  'Append-only attributed history for governed checklist template versions.';

CREATE OR REPLACE FUNCTION public.reject_workshop_checklist_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Workshop checklist events are append-only'
    USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS workshop_checklist_events_append_only_row
  ON public.workshop_checklist_events;
CREATE TRIGGER workshop_checklist_events_append_only_row
  BEFORE UPDATE OR DELETE ON public.workshop_checklist_events
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_workshop_checklist_event_mutation();

DROP TRIGGER IF EXISTS workshop_checklist_events_append_only_truncate
  ON public.workshop_checklist_events;
CREATE TRIGGER workshop_checklist_events_append_only_truncate
  BEFORE TRUNCATE ON public.workshop_checklist_events
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.reject_workshop_checklist_event_mutation();

CREATE OR REPLACE FUNCTION public.create_draft_checklist_version(
  phase text,
  bike_category text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_phase text := phase;
  v_bike_category text := bike_category;
  v_actor_id uuid;
  v_role public.user_role;
  v_template_id uuid;
  v_version_id uuid;
  v_version_number integer;
BEGIN
  v_actor_id := (SELECT auth.uid());
  v_role := public.get_user_role();

  IF v_actor_id IS NULL
     OR v_role IS NULL
     OR v_role <> ALL (
       ARRAY['admin'::public.user_role, 'manager'::public.user_role]
     )
  THEN
    RAISE EXCEPTION 'Not authorized to create a checklist draft'
      USING ERRCODE = '42501';
  END IF;

  IF v_phase IS NULL OR v_phase NOT IN ('prep', 'return') THEN
    RAISE EXCEPTION 'Unsupported checklist phase'
      USING ERRCODE = '22023';
  END IF;

  IF v_bike_category IS NULL
     OR v_bike_category NOT IN ('e-city', 'e-road', 'road', 'gravel', 'mtb')
  THEN
    RAISE EXCEPTION 'Unsupported bike category'
      USING ERRCODE = '22023';
  END IF;

  -- Story 1.4 reuses this (bike_category, phase) lock key for activation.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'workshop_checklist:' || v_bike_category || ':' || v_phase,
      0
    )
  );

  INSERT INTO public.workshop_checklist_templates AS template (phase, bike_category)
  SELECT v_phase, v_bike_category
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.workshop_checklist_templates AS existing
    WHERE existing.phase = v_phase
      AND existing.bike_category = v_bike_category
  );

  SELECT id
  INTO STRICT v_template_id
  FROM public.workshop_checklist_templates
  WHERE workshop_checklist_templates.phase = v_phase
    AND workshop_checklist_templates.bike_category = v_bike_category;

  SELECT COALESCE(MAX(workshop_checklist_versions.version_number), 0) + 1
  INTO v_version_number
  FROM public.workshop_checklist_versions
  WHERE workshop_checklist_versions.template_id = v_template_id;

  INSERT INTO public.workshop_checklist_versions (
    template_id,
    version_number,
    status,
    created_by,
    revision
  )
  VALUES (
    v_template_id,
    v_version_number,
    'draft',
    v_actor_id,
    1
  )
  RETURNING id INTO v_version_id;

  INSERT INTO public.workshop_checklist_events (
    event_type,
    actor_id,
    phase,
    bike_category,
    template_id,
    version_id,
    version_number,
    revision
  )
  VALUES (
    'created',
    v_actor_id,
    v_phase,
    v_bike_category,
    v_template_id,
    v_version_id,
    v_version_number,
    1
  );

  RETURN v_version_id;
END;
$$;

COMMENT ON FUNCTION public.create_draft_checklist_version(text, text) IS
  'Admin/Manager-only transactional draft allocation. Locks (bike_category, phase) for template upsert and monotonic version numbers; Story 1.4 reuses this lock key.';

ALTER TABLE public.workshop_checklist_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and managers can read workshop checklist events"
  ON public.workshop_checklist_events;
CREATE POLICY "Admins and managers can read workshop checklist events"
  ON public.workshop_checklist_events
  FOR SELECT
  TO authenticated
  USING (
    (select public.get_user_role()) = ANY (
      ARRAY['admin'::public.user_role, 'manager'::public.user_role]
    )
  );

REVOKE ALL ON TABLE public.workshop_checklist_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_draft_checklist_version(text, text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_workshop_checklist_event_mutation()
  FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.workshop_checklist_events TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_draft_checklist_version(text, text)
  TO authenticated;
