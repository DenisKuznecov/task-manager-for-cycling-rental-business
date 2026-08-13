-- Privileged activation of a Draft checklist version. Authenticated roles keep
-- SELECT-only table access; writes go through this SECURITY DEFINER RPC that
-- authorizes Admin/Manager, requires status='draft', matches expected_revision
-- and expected_active_version_id, re-validates Item structure (not coverage),
-- and commits Active + optional Supersede + one activated event together.

ALTER TABLE public.workshop_checklist_events
  ADD COLUMN IF NOT EXISTS superseded_version_id uuid;

ALTER TABLE public.workshop_checklist_events
  DROP CONSTRAINT IF EXISTS workshop_checklist_events_superseded_version_id_fkey;
ALTER TABLE public.workshop_checklist_events
  ADD CONSTRAINT workshop_checklist_events_superseded_version_id_fkey
  FOREIGN KEY (superseded_version_id)
  REFERENCES public.workshop_checklist_versions(id)
  ON DELETE RESTRICT;

ALTER TABLE public.workshop_checklist_events
  DROP CONSTRAINT IF EXISTS workshop_checklist_events_event_type_check;
ALTER TABLE public.workshop_checklist_events
  ADD CONSTRAINT workshop_checklist_events_event_type_check
  CHECK (
    event_type IN (
      'created',
      'item_added',
      'item_updated',
      'item_removed',
      'items_reordered',
      'activated'
    )
  );

CREATE OR REPLACE FUNCTION public.activate_checklist_version(
  version_id uuid,
  expected_revision integer,
  expected_active_version_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_version_id uuid := version_id;
  v_expected_revision integer := expected_revision;
  v_expected_active_id uuid := expected_active_version_id;
  v_actor_id uuid;
  v_role public.user_role;
  v_phase text;
  v_bike_category text;
  v_template_id uuid;
  v_version_number integer;
  v_status text;
  v_revision integer;
  v_active_id uuid;
  v_active_number integer;
  v_new_revision integer;
BEGIN
  v_actor_id := (SELECT auth.uid());
  v_role := public.get_user_role();

  IF v_actor_id IS NULL
     OR v_role IS NULL
     OR v_role <> ALL (
       ARRAY['admin'::public.user_role, 'manager'::public.user_role]
     )
  THEN
    RAISE EXCEPTION 'Not authorized to activate a checklist version'
      USING ERRCODE = '42501';
  END IF;

  IF v_version_id IS NULL THEN
    RAISE EXCEPTION 'Checklist version not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_expected_revision IS NULL OR v_expected_revision <= 0 THEN
    RAISE EXCEPTION 'Checklist version is stale'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT
    template.phase,
    template.bike_category,
    template.id
  INTO v_phase, v_bike_category, v_template_id
  FROM public.workshop_checklist_versions AS version
  JOIN public.workshop_checklist_templates AS template
    ON template.id = version.template_id
  WHERE version.id = v_version_id;

  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'Checklist version not found'
      USING ERRCODE = 'P0002';
  END IF;

  -- Same (bike_category, phase) lock used by draft create and item writes.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'workshop_checklist:' || v_bike_category || ':' || v_phase,
      0
    )
  );

  SELECT
    version.template_id,
    version.version_number,
    version.status,
    version.revision
  INTO v_template_id, v_version_number, v_status, v_revision
  FROM public.workshop_checklist_versions AS version
  WHERE version.id = v_version_id
  FOR UPDATE;

  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'Checklist version not found'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT version.id, version.version_number
  INTO v_active_id, v_active_number
  FROM public.workshop_checklist_versions AS version
  WHERE version.template_id = v_template_id
    AND version.status = 'active'
  FOR UPDATE;

  IF v_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'Checklist version is not a draft'
      USING ERRCODE = '55000',
            DETAIL = pg_catalog.json_build_object(
              'revision', v_revision,
              'status', v_status,
              'activeVersionId', v_active_id,
              'activeVersionNumber', v_active_number
            )::text;
  END IF;

  IF v_revision IS DISTINCT FROM v_expected_revision
     OR v_active_id IS DISTINCT FROM v_expected_active_id
  THEN
    RAISE EXCEPTION 'Checklist version is stale'
      USING ERRCODE = 'P0001',
            DETAIL = pg_catalog.json_build_object(
              'stale', true,
              'revision', v_revision,
              'status', v_status,
              'activeVersionId', v_active_id,
              'activeVersionNumber', v_active_number
            )::text;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.workshop_checklist_items AS item
    WHERE item.version_id = v_version_id
      AND item.m2
      AND NOT item.m1
  ) THEN
    RAISE EXCEPTION 'M2 requires M1'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.workshop_checklist_items AS item
    WHERE item.version_id = v_version_id
      AND item.item_type NOT IN ('action', 'value')
  ) THEN
    RAISE EXCEPTION 'Unsupported item type'
      USING ERRCODE = '22023';
  END IF;

  -- Supersede first so the unique one-Active-per-template index is never violated.
  IF v_active_id IS NOT NULL THEN
    UPDATE public.workshop_checklist_versions
    SET
      status = 'superseded',
      revision = revision + 1
    WHERE id = v_active_id;
  END IF;

  UPDATE public.workshop_checklist_versions
  SET
    status = 'active',
    revision = revision + 1
  WHERE id = v_version_id
  RETURNING revision INTO v_new_revision;

  INSERT INTO public.workshop_checklist_events (
    event_type,
    actor_id,
    phase,
    bike_category,
    template_id,
    version_id,
    version_number,
    revision,
    superseded_version_id
  )
  VALUES (
    'activated',
    v_actor_id,
    v_phase,
    v_bike_category,
    v_template_id,
    v_version_id,
    v_version_number,
    v_new_revision,
    v_active_id
  );

  RETURN v_new_revision;
END;
$$;

COMMENT ON FUNCTION public.activate_checklist_version(uuid, integer, uuid) IS
  'Admin/Manager-only transactional activation. Locks (bike_category, phase), matches expected_revision and expected_active_version_id, validates Item structure, and commits Active + optional Supersede + one activated event.';

REVOKE ALL ON FUNCTION public.activate_checklist_version(uuid, integer, uuid)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.activate_checklist_version(uuid, integer, uuid)
  TO authenticated;
