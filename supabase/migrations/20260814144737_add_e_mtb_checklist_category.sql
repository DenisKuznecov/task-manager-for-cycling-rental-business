-- Add E-MTB to the shared Workshop checklist category contract. The
-- drop-then-create constraints and CREATE OR REPLACE function make this safe
-- to re-run after a partially applied local migration.

ALTER TABLE public.workshop_checklist_templates
  DROP CONSTRAINT IF EXISTS workshop_checklist_templates_bike_category_check;

ALTER TABLE public.workshop_checklist_templates
  ADD CONSTRAINT workshop_checklist_templates_bike_category_check
  CHECK (
    bike_category IN ('e-city', 'e-road', 'road', 'gravel', 'mtb', 'e-mtb')
  );

ALTER TABLE public.workshop_checklist_events
  DROP CONSTRAINT IF EXISTS workshop_checklist_events_bike_category_check;

ALTER TABLE public.workshop_checklist_events
  ADD CONSTRAINT workshop_checklist_events_bike_category_check
  CHECK (
    bike_category IN ('e-city', 'e-road', 'road', 'gravel', 'mtb', 'e-mtb')
  );

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
     OR v_bike_category NOT IN (
       'e-city',
       'e-road',
       'road',
       'gravel',
       'mtb',
       'e-mtb'
     )
  THEN
    RAISE EXCEPTION 'Unsupported bike category'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'workshop_checklist:' || v_bike_category || ':' || v_phase,
      0
    )
  );

  INSERT INTO public.workshop_checklist_templates AS template (
    phase,
    bike_category
  )
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
  'Admin/Manager-only transactional draft allocation for all six bike categories. Locks (bike_category, phase) for template upsert and monotonic version numbers.';
