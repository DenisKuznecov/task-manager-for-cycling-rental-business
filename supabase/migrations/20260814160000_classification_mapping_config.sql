-- Versioned ProductGroup allowlist and Setup Category mapping contract.
-- Enum labels are fixture-checked against src/lib/booqable/contracts.
-- Authenticated roles have SELECT-only access; approve/rollback are admin-only
-- SECURITY DEFINER RPCs. Empty allowlist and unproven slots are the v1 snapshot.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'classification_config_mode'
  ) THEN
    CREATE TYPE public.classification_config_mode AS ENUM (
      'review_updated_configuration',
      'targeted'
    );
  END IF;
END
$$;

ALTER TYPE public.classification_config_mode
  ADD VALUE IF NOT EXISTS 'review_updated_configuration';
ALTER TYPE public.classification_config_mode
  ADD VALUE IF NOT EXISTS 'targeted';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'classification_config_status'
  ) THEN
    CREATE TYPE public.classification_config_status AS ENUM (
      'active',
      'superseded'
    );
  END IF;
END
$$;

ALTER TYPE public.classification_config_status ADD VALUE IF NOT EXISTS 'active';
ALTER TYPE public.classification_config_status ADD VALUE IF NOT EXISTS 'superseded';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'classification_setup_category'
  ) THEN
    CREATE TYPE public.classification_setup_category AS ENUM (
      'pedals',
      'saddle',
      'wheelset',
      'power-meter',
      'computer-mount'
    );
  END IF;
END
$$;

ALTER TYPE public.classification_setup_category ADD VALUE IF NOT EXISTS 'pedals';
ALTER TYPE public.classification_setup_category ADD VALUE IF NOT EXISTS 'saddle';
ALTER TYPE public.classification_setup_category ADD VALUE IF NOT EXISTS 'wheelset';
ALTER TYPE public.classification_setup_category ADD VALUE IF NOT EXISTS 'power-meter';
ALTER TYPE public.classification_setup_category ADD VALUE IF NOT EXISTS 'computer-mount';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'classification_setup_fixture_kind'
  ) THEN
    CREATE TYPE public.classification_setup_fixture_kind AS ENUM (
      'null',
      'unknown',
      'changed',
      'removed'
    );
  END IF;
END
$$;

ALTER TYPE public.classification_setup_fixture_kind ADD VALUE IF NOT EXISTS 'null';
ALTER TYPE public.classification_setup_fixture_kind ADD VALUE IF NOT EXISTS 'unknown';
ALTER TYPE public.classification_setup_fixture_kind ADD VALUE IF NOT EXISTS 'changed';
ALTER TYPE public.classification_setup_fixture_kind ADD VALUE IF NOT EXISTS 'removed';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'classification_allowlist_origin'
  ) THEN
    CREATE TYPE public.classification_allowlist_origin AS ENUM (
      'business_approved'
    );
  END IF;
END
$$;

ALTER TYPE public.classification_allowlist_origin
  ADD VALUE IF NOT EXISTS 'business_approved';

CREATE TABLE IF NOT EXISTS public.classification_mapping_config_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision integer NOT NULL CHECK (revision > 0),
  status public.classification_config_status NOT NULL,
  mode public.classification_config_mode NOT NULL,
  allowlist jsonb NOT NULL DEFAULT '{}'::jsonb,
  display_labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  setup_slots jsonb NOT NULL,
  provenance jsonb NOT NULL,
  approved_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  approved_at timestamptz NOT NULL DEFAULT now(),
  prior_version_id uuid REFERENCES public.classification_mapping_config_versions(id)
    ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS classification_mapping_config_one_active_idx
  ON public.classification_mapping_config_versions ((true))
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS classification_mapping_config_versions_revision_idx
  ON public.classification_mapping_config_versions (revision DESC);

CREATE TABLE IF NOT EXISTS public.classification_mapping_config_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  version_id uuid NOT NULL REFERENCES public.classification_mapping_config_versions(id)
    ON DELETE RESTRICT,
  revision integer NOT NULL CHECK (revision > 0),
  prior_version_id uuid REFERENCES public.classification_mapping_config_versions(id)
    ON DELETE RESTRICT,
  mode public.classification_config_mode NOT NULL,
  CONSTRAINT classification_mapping_config_events_event_type_check
    CHECK (event_type IN ('approved', 'rolled_back'))
);

CREATE INDEX IF NOT EXISTS classification_mapping_config_events_version_idx
  ON public.classification_mapping_config_events (version_id);

CREATE INDEX IF NOT EXISTS classification_mapping_config_events_occurred_idx
  ON public.classification_mapping_config_events (occurred_at);

COMMENT ON TABLE public.classification_mapping_config_versions IS
  'Immutable approved snapshots of the ProductGroup allowlist and Setup mapping contract. Runtime classification reads the Active row, not live file edits.';

COMMENT ON TABLE public.classification_mapping_config_events IS
  'Append-only attributed history for classification mapping approve and rollback.';

CREATE OR REPLACE FUNCTION public.reject_classification_mapping_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Classification mapping events are append-only'
    USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS classification_mapping_config_events_append_only_row
  ON public.classification_mapping_config_events;
CREATE TRIGGER classification_mapping_config_events_append_only_row
  BEFORE UPDATE OR DELETE ON public.classification_mapping_config_events
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_classification_mapping_event_mutation();

DROP TRIGGER IF EXISTS classification_mapping_config_events_append_only_truncate
  ON public.classification_mapping_config_events;
CREATE TRIGGER classification_mapping_config_events_append_only_truncate
  BEFORE TRUNCATE ON public.classification_mapping_config_events
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.reject_classification_mapping_event_mutation();

CREATE OR REPLACE FUNCTION public.classification_setup_slots_are_proven(
  setup_slots jsonb
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT
    jsonb_typeof(setup_slots) = 'array'
    AND jsonb_array_length(setup_slots) = 5
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(setup_slots) AS slot
      WHERE COALESCE(pg_catalog.btrim(slot->>'identifier'), '') = ''
         OR COALESCE(pg_catalog.btrim(slot->'fixtures'->>'null'), '') = ''
         OR COALESCE(pg_catalog.btrim(slot->'fixtures'->>'unknown'), '') = ''
         OR COALESCE(pg_catalog.btrim(slot->'fixtures'->>'changed'), '') = ''
         OR COALESCE(pg_catalog.btrim(slot->'fixtures'->>'removed'), '') = ''
    );
$$;

CREATE OR REPLACE FUNCTION public.approve_classification_mapping_config(
  expected_revision integer,
  expected_active_version_id uuid,
  mode public.classification_config_mode,
  allowlist jsonb,
  display_labels jsonb,
  setup_slots jsonb,
  provenance jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_expected_revision integer := expected_revision;
  v_expected_active_id uuid := expected_active_version_id;
  v_mode public.classification_config_mode := mode;
  v_allowlist jsonb := allowlist;
  v_display_labels jsonb := display_labels;
  v_setup_slots jsonb := setup_slots;
  v_provenance jsonb := provenance;
  v_actor_id uuid;
  v_role public.user_role;
  v_active_id uuid;
  v_active_revision integer;
  v_new_revision integer;
  v_new_id uuid;
  v_categories text[];
BEGIN
  v_actor_id := (SELECT auth.uid());
  v_role := public.get_user_role();

  IF v_actor_id IS NULL
     OR v_role IS NULL
     OR v_role IS DISTINCT FROM 'admin'::public.user_role
  THEN
    RAISE EXCEPTION 'Not authorized to approve classification mapping configuration'
      USING ERRCODE = '42501';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('classification_mapping_config', 0)
  );

  SELECT version.id, version.revision
  INTO v_active_id, v_active_revision
  FROM public.classification_mapping_config_versions AS version
  WHERE version.status = 'active'
  FOR UPDATE;

  IF v_active_id IS NULL THEN
    IF v_expected_revision IS DISTINCT FROM 0
       OR v_expected_active_id IS NOT NULL
    THEN
      RAISE EXCEPTION 'Classification mapping configuration is stale'
        USING ERRCODE = 'P0001',
              DETAIL = pg_catalog.json_build_object(
                'stale', true,
                'revision', 0,
                'activeVersionId', null
              )::text;
    END IF;
  ELSIF v_expected_revision IS DISTINCT FROM v_active_revision
     OR v_expected_active_id IS DISTINCT FROM v_active_id
  THEN
    RAISE EXCEPTION 'Classification mapping configuration is stale'
      USING ERRCODE = 'P0001',
            DETAIL = pg_catalog.json_build_object(
              'stale', true,
              'revision', v_active_revision,
              'activeVersionId', v_active_id
            )::text;
  END IF;

  IF jsonb_typeof(v_allowlist) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Allowlist keys must be ProductGroup UUIDs'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_object_keys(v_allowlist) AS key
    WHERE key !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) THEN
    RAISE EXCEPTION 'Allowlist keys must be ProductGroup UUIDs'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_each(v_allowlist) AS entry
    WHERE jsonb_typeof(entry.value) IS DISTINCT FROM 'object'
       OR COALESCE(entry.value->>'origin', '') IS DISTINCT FROM 'business_approved'
       OR COALESCE(pg_catalog.btrim(entry.value->>'collected_at'), '') = ''
  ) THEN
    RAISE EXCEPTION 'Allowlist keys must be ProductGroup UUIDs'
      USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(v_display_labels) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Display labels must be an array'
      USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(v_setup_slots) IS DISTINCT FROM 'array'
     OR jsonb_array_length(v_setup_slots) IS DISTINCT FROM 5
  THEN
    RAISE EXCEPTION 'Setup slots must cover every Workshop Setup Category'
      USING ERRCODE = '22023';
  END IF;

  SELECT array_agg(slot.value->>'category' ORDER BY slot.ordinality)
  INTO v_categories
  FROM jsonb_array_elements(v_setup_slots) WITH ORDINALITY AS slot(value, ordinality);

  IF v_categories IS DISTINCT FROM ARRAY[
    'pedals',
    'saddle',
    'wheelset',
    'power-meter',
    'computer-mount'
  ]::text[]
  THEN
    RAISE EXCEPTION 'Setup slots must cover every Workshop Setup Category'
      USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(v_provenance) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Provenance is required'
      USING ERRCODE = '22023';
  END IF;

  IF v_mode = 'targeted'::public.classification_config_mode
     AND NOT public.classification_setup_slots_are_proven(v_setup_slots)
  THEN
    RAISE EXCEPTION 'Targeted mode requires proven setup mappings'
      USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(pg_catalog.max(version.revision), 0) + 1
  INTO v_new_revision
  FROM public.classification_mapping_config_versions AS version;

  IF v_active_id IS NOT NULL THEN
    UPDATE public.classification_mapping_config_versions
    SET status = 'superseded'
    WHERE id = v_active_id;
  END IF;

  INSERT INTO public.classification_mapping_config_versions (
    revision,
    status,
    mode,
    allowlist,
    display_labels,
    setup_slots,
    provenance,
    approved_by,
    prior_version_id
  )
  VALUES (
    v_new_revision,
    'active',
    v_mode,
    v_allowlist,
    v_display_labels,
    v_setup_slots,
    v_provenance,
    v_actor_id,
    v_active_id
  )
  RETURNING id INTO v_new_id;

  INSERT INTO public.classification_mapping_config_events (
    event_type,
    actor_id,
    version_id,
    revision,
    prior_version_id,
    mode
  )
  VALUES (
    'approved',
    v_actor_id,
    v_new_id,
    v_new_revision,
    v_active_id,
    v_mode
  );

  RETURN v_new_revision;
END;
$$;

COMMENT ON FUNCTION public.approve_classification_mapping_config(integer, uuid, public.classification_config_mode, jsonb, jsonb, jsonb, jsonb) IS
  'Admin-only transactional approve. Copies the submitted source snapshot into a new Active row, supersedes the previous Active, and records revision, approver, time, provenance, mode, and prior version.';

CREATE OR REPLACE FUNCTION public.rollback_classification_mapping_config(
  prior_version_id uuid,
  expected_revision integer,
  expected_active_version_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_prior_id uuid := prior_version_id;
  v_expected_revision integer := expected_revision;
  v_expected_active_id uuid := expected_active_version_id;
  v_actor_id uuid;
  v_role public.user_role;
  v_active_id uuid;
  v_active_revision integer;
  v_prior_revision integer;
  v_prior_status public.classification_config_status;
  v_prior_mode public.classification_config_mode;
BEGIN
  v_actor_id := (SELECT auth.uid());
  v_role := public.get_user_role();

  IF v_actor_id IS NULL
     OR v_role IS NULL
     OR v_role IS DISTINCT FROM 'admin'::public.user_role
  THEN
    RAISE EXCEPTION 'Not authorized to roll back classification mapping configuration'
      USING ERRCODE = '42501';
  END IF;

  IF v_prior_id IS NULL THEN
    RAISE EXCEPTION 'Classification mapping version not found'
      USING ERRCODE = 'P0002';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('classification_mapping_config', 0)
  );

  SELECT version.id, version.revision
  INTO v_active_id, v_active_revision
  FROM public.classification_mapping_config_versions AS version
  WHERE version.status = 'active'
  FOR UPDATE;

  IF v_active_id IS NULL
     OR v_expected_revision IS DISTINCT FROM v_active_revision
     OR v_expected_active_id IS DISTINCT FROM v_active_id
  THEN
    RAISE EXCEPTION 'Classification mapping configuration is stale'
      USING ERRCODE = 'P0001',
            DETAIL = pg_catalog.json_build_object(
              'stale', true,
              'revision', v_active_revision,
              'activeVersionId', v_active_id
            )::text;
  END IF;

  IF v_prior_id = v_active_id THEN
    RAISE EXCEPTION 'Cannot roll back to the current Active version'
      USING ERRCODE = '22023';
  END IF;

  SELECT version.revision, version.status, version.mode
  INTO v_prior_revision, v_prior_status, v_prior_mode
  FROM public.classification_mapping_config_versions AS version
  WHERE version.id = v_prior_id
  FOR UPDATE;

  IF v_prior_revision IS NULL THEN
    RAISE EXCEPTION 'Classification mapping version not found'
      USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.classification_mapping_config_versions
  SET status = 'superseded'
  WHERE id = v_active_id;

  UPDATE public.classification_mapping_config_versions
  SET status = 'active'
  WHERE id = v_prior_id;

  INSERT INTO public.classification_mapping_config_events (
    event_type,
    actor_id,
    version_id,
    revision,
    prior_version_id,
    mode
  )
  VALUES (
    'rolled_back',
    v_actor_id,
    v_prior_id,
    v_prior_revision,
    v_active_id,
    v_prior_mode
  );

  RETURN v_prior_revision;
END;
$$;

COMMENT ON FUNCTION public.rollback_classification_mapping_config(uuid, integer, uuid) IS
  'Admin-only transactional rollback. Restores a prior snapshot as Active, supersedes the current Active, and writes an attributed audit row without editing the source file.';

REVOKE ALL ON FUNCTION public.approve_classification_mapping_config(integer, uuid, public.classification_config_mode, jsonb, jsonb, jsonb, jsonb)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.approve_classification_mapping_config(integer, uuid, public.classification_config_mode, jsonb, jsonb, jsonb, jsonb)
  TO authenticated;

REVOKE ALL ON FUNCTION public.rollback_classification_mapping_config(uuid, integer, uuid)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.rollback_classification_mapping_config(uuid, integer, uuid)
  TO authenticated;

REVOKE ALL ON FUNCTION public.classification_setup_slots_are_proven(jsonb)
  FROM PUBLIC, anon, authenticated;

ALTER TABLE public.classification_mapping_config_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classification_mapping_config_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read classification mapping versions"
  ON public.classification_mapping_config_versions;
CREATE POLICY "Admins can read classification mapping versions"
  ON public.classification_mapping_config_versions
  FOR SELECT
  TO authenticated
  USING (
    (select public.get_user_role()) = 'admin'::public.user_role
  );

DROP POLICY IF EXISTS "Admins can read classification mapping events"
  ON public.classification_mapping_config_events;
CREATE POLICY "Admins can read classification mapping events"
  ON public.classification_mapping_config_events
  FOR SELECT
  TO authenticated
  USING (
    (select public.get_user_role()) = 'admin'::public.user_role
  );

REVOKE ALL ON TABLE public.classification_mapping_config_versions
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.classification_mapping_config_events
  FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.classification_mapping_config_versions TO authenticated;
GRANT SELECT ON TABLE public.classification_mapping_config_events TO authenticated;
