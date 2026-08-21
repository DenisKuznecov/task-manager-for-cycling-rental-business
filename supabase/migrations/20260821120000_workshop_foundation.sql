-- Workshop foundation: schema, seeds, staff commands, read models, RLS, realtime.
-- Idempotent. Apply locally only.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.bike_task_status AS ENUM (
    'to_prepare',
    'being_prepared',
    'needs_recheck',
    'ready_for_pickup',
    'in_rental',
    'returned',
    'prepare_for_storage',
    'completed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.bike_task_item_stage AS ENUM ('preparation', 'storage');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.checklist_item_type AS ENUM ('action', 'tyre_pressure_psi');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.checklist_item_outcome AS ENUM ('completed', 'not_applicable');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.bike_task_attestation_stage AS ENUM ('m1', 'm2', 'storage');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS addon_fingerprint text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS source_fingerprint text;

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
GRANT USAGE ON SCHEMA private TO postgres, service_role, authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.checklist_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_key text NOT NULL,
  version integer NOT NULL CHECK (version >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (definition_key, version)
);

CREATE TABLE IF NOT EXISTS public.checklist_definition_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id uuid NOT NULL REFERENCES public.checklist_definitions (id) ON DELETE RESTRICT,
  item_key text NOT NULL,
  sort_order integer NOT NULL,
  label text NOT NULL,
  item_type public.checklist_item_type NOT NULL,
  required boolean NOT NULL DEFAULT true,
  m2_verifies boolean NOT NULL DEFAULT false,
  na_allowed boolean NOT NULL DEFAULT false,
  UNIQUE (definition_id, item_key),
  UNIQUE (definition_id, sort_order)
);

CREATE TABLE IF NOT EXISTS public.checklist_tag_mappings (
  tag text PRIMARY KEY,
  definition_id uuid REFERENCES public.checklist_definitions (id) ON DELETE RESTRICT,
  enabled boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.booqable_assignment_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE RESTRICT,
  booqable_stock_item_id text NOT NULL,
  bike_display_id text,
  bike_title text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS booqable_assignment_instances_active_uidx
  ON public.booqable_assignment_instances (order_id, booqable_stock_item_id)
  WHERE closed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.bike_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_instance_id uuid NOT NULL REFERENCES public.booqable_assignment_instances (id) ON DELETE RESTRICT,
  task_kind text NOT NULL DEFAULT 'rental_turnaround' CHECK (task_kind = 'rental_turnaround'),
  status public.bike_task_status NOT NULL DEFAULT 'to_prepare',
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE RESTRICT,
  order_number integer,
  starts_at timestamptz,
  booqable_stock_item_id text NOT NULL,
  bike_display_id text,
  bike_title text,
  workshop_tag text,
  has_configuration_warning boolean NOT NULL DEFAULT false,
  selected_definition_id uuid REFERENCES public.checklist_definitions (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_instance_id, task_kind)
);

CREATE UNIQUE INDEX IF NOT EXISTS bike_tasks_one_open_per_source_uidx
  ON public.bike_tasks (order_id, booqable_stock_item_id, task_kind)
  WHERE status <> ALL (ARRAY['completed'::public.bike_task_status, 'cancelled'::public.bike_task_status]);

CREATE INDEX IF NOT EXISTS bike_tasks_queue_idx
  ON public.bike_tasks (starts_at, order_number, bike_display_id, id);

CREATE TABLE IF NOT EXISTS public.bike_task_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.bike_tasks (id) ON DELETE RESTRICT,
  stage public.bike_task_item_stage NOT NULL,
  item_key text NOT NULL,
  sort_order integer NOT NULL,
  label text NOT NULL,
  item_type public.checklist_item_type NOT NULL,
  required boolean NOT NULL DEFAULT true,
  m2_verifies boolean NOT NULL DEFAULT false,
  na_allowed boolean NOT NULL DEFAULT false,
  definition_id uuid REFERENCES public.checklist_definitions (id) ON DELETE RESTRICT,
  definition_item_id uuid REFERENCES public.checklist_definition_items (id) ON DELETE RESTRICT,
  m1_outcome public.checklist_item_outcome,
  m1_psi numeric,
  m2_confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, stage, item_key)
);

CREATE INDEX IF NOT EXISTS bike_task_items_task_id_idx
  ON public.bike_task_items (task_id);

CREATE TABLE IF NOT EXISTS public.bike_task_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.bike_tasks (id) ON DELETE RESTRICT,
  event_kind text NOT NULL,
  from_status public.bike_task_status,
  to_status public.bike_task_status,
  resulting_version integer NOT NULL,
  source text NOT NULL DEFAULT 'staff_command',
  actor_id uuid,
  actor_first_name text,
  actor_last_name text,
  source_fingerprint text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bike_task_events_task_id_idx
  ON public.bike_task_events (task_id, occurred_at);

CREATE TABLE IF NOT EXISTS public.bike_task_attestations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.bike_tasks (id) ON DELETE RESTRICT,
  stage public.bike_task_attestation_stage NOT NULL,
  user_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  same_person_confirmed boolean NOT NULL DEFAULT false,
  addon_snapshot jsonb,
  addon_fingerprint text,
  UNIQUE (task_id, stage)
);

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE ALL ON TABLES FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE ALL ON SEQUENCES FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE ALL ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE ALL ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE ALL ON FUNCTIONS FROM authenticated;

DROP TYPE IF EXISTS private.workshop_begin_result CASCADE;
CREATE TYPE private.workshop_begin_result AS (
  err jsonb,
  user_id uuid,
  first_name text,
  last_name text,
  task_id uuid,
  status public.bike_task_status,
  version integer,
  order_id uuid,
  workshop_tag text,
  has_configuration_warning boolean,
  selected_definition_id uuid
);

-- ---------------------------------------------------------------------------
-- Immutable history
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.workshop_reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'append-only: %', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$;

DROP TRIGGER IF EXISTS checklist_definitions_append_only ON public.checklist_definitions;
CREATE TRIGGER checklist_definitions_append_only
  BEFORE UPDATE OR DELETE ON public.checklist_definitions
  FOR EACH ROW EXECUTE FUNCTION private.workshop_reject_mutation();

DROP TRIGGER IF EXISTS checklist_definition_items_append_only ON public.checklist_definition_items;
CREATE TRIGGER checklist_definition_items_append_only
  BEFORE UPDATE OR DELETE ON public.checklist_definition_items
  FOR EACH ROW EXECUTE FUNCTION private.workshop_reject_mutation();

DROP TRIGGER IF EXISTS bike_task_events_append_only ON public.bike_task_events;
CREATE TRIGGER bike_task_events_append_only
  BEFORE UPDATE OR DELETE ON public.bike_task_events
  FOR EACH ROW EXECUTE FUNCTION private.workshop_reject_mutation();

DROP TRIGGER IF EXISTS bike_task_attestations_append_only ON public.bike_task_attestations;
CREATE TRIGGER bike_task_attestations_append_only
  BEFORE UPDATE OR DELETE ON public.bike_task_attestations
  FOR EACH ROW EXECUTE FUNCTION private.workshop_reject_mutation();

-- ---------------------------------------------------------------------------
-- Seeds: ROAD-01..25 and STORAGE-01..06. Four other tags stay disabled.
-- ---------------------------------------------------------------------------

INSERT INTO public.checklist_definitions (definition_key, version)
VALUES ('road_bike_preparation', 1)
ON CONFLICT (definition_key, version) DO NOTHING;

INSERT INTO public.checklist_definitions (definition_key, version)
VALUES ('prepare_for_storage', 1)
ON CONFLICT (definition_key, version) DO NOTHING;

INSERT INTO public.checklist_definition_items (
  definition_id, item_key, sort_order, label, item_type, required, m2_verifies, na_allowed
)
SELECT d.id, v.item_key, v.sort_order, v.label, v.item_type, true, v.m2_verifies, v.na_allowed
FROM public.checklist_definitions d
CROSS JOIN (
  VALUES
    ('ROAD-01', 1,  'Check bike cleaned',                              'action'::public.checklist_item_type, false, false),
    ('ROAD-02', 2,  'Check frame and components for damage',           'action', false, false),
    ('ROAD-03', 3,  'Check front brake performance',                   'action', true,  false),
    ('ROAD-04', 4,  'Check rear brake performance',                    'action', true,  false),
    ('ROAD-05', 5,  'Check front derailleur shifting',                 'action', true,  true),
    ('ROAD-06', 6,  'Check rear derailleur shifting',                  'action', true,  false),
    ('ROAD-07', 7,  'Torque check: pedals',                            'action', true,  false),
    ('ROAD-08', 8,  'Torque check: stem and handlebar',                'action', true,  false),
    ('ROAD-09', 9,  'Torque check: seatpost and saddle clamp',         'action', true,  false),
    ('ROAD-10', 10, 'Torque check: front and rear thru-axles',         'action', true,  false),
    ('ROAD-11', 11, 'Check headset for play',                          'action', true,  false),
    ('ROAD-12', 12, 'Check front wheel is true',                       'action', true,  false),
    ('ROAD-13', 13, 'Check front tyre for wear, cuts, and cracks',     'action', true,  false),
    ('ROAD-14', 14, 'Check rear wheel is true',                        'action', true,  false),
    ('ROAD-15', 15, 'Check rear tyre for wear, cuts, and cracks',      'action', true,  false),
    ('ROAD-16', 16, 'Set front tyre pressure',                         'tyre_pressure_psi', true, false),
    ('ROAD-17', 17, 'Set rear tyre pressure',                          'tyre_pressure_psi', true, false),
    ('ROAD-18', 18, 'Check main battery level is above 80%',           'action', true,  true),
    ('ROAD-19', 19, 'Check shifters battery level is above 20%',       'action', true,  true),
    ('ROAD-20', 20, 'Check power-meter battery level is above 20%',    'action', true,  true),
    ('ROAD-21', 21, 'Check saddle bag contents and pump',              'action', true,  false),
    ('ROAD-22', 22, 'Verify charger and lube are included',            'action', true,  true),
    ('ROAD-23', 23, 'Attach customer name tag',                        'action', false, false),
    ('ROAD-24', 24, 'Check saddle level',                              'action', false, false),
    ('ROAD-25', 25, 'Apply bikefit',                                   'action', false, true)
) AS v(item_key, sort_order, label, item_type, m2_verifies, na_allowed)
WHERE d.definition_key = 'road_bike_preparation' AND d.version = 1
ON CONFLICT (definition_id, item_key) DO NOTHING;

INSERT INTO public.checklist_definition_items (
  definition_id, item_key, sort_order, label, item_type, required, m2_verifies, na_allowed
)
SELECT d.id, v.item_key, v.sort_order, v.label, 'action'::public.checklist_item_type, true, false, v.na_allowed
FROM public.checklist_definitions d
CROSS JOIN (
  VALUES
    ('STORAGE-01', 1, 'Check bike for damage', false),
    ('STORAGE-02', 2, 'Check saddle bag contents', true),
    ('STORAGE-03', 3, 'Check charger', true),
    ('STORAGE-04', 4, 'Restore customized parts and settings to the bike''s default setup', true),
    ('STORAGE-05', 5, 'Clean the bike', false),
    ('STORAGE-06', 6, 'Return the bike to storage', false)
) AS v(item_key, sort_order, label, na_allowed)
WHERE d.definition_key = 'prepare_for_storage' AND d.version = 1
ON CONFLICT (definition_id, item_key) DO NOTHING;

INSERT INTO public.checklist_tag_mappings (tag, definition_id, enabled)
SELECT 'workshop-road-bike', d.id, true
FROM public.checklist_definitions d
WHERE d.definition_key = 'road_bike_preparation' AND d.version = 1
ON CONFLICT (tag) DO NOTHING;

INSERT INTO public.checklist_tag_mappings (tag, definition_id, enabled)
VALUES
  ('workshop-e-city-bike', NULL, false),
  ('workshop-e-mtb-bike', NULL, false),
  ('workshop-gravel-bike', NULL, false),
  ('workshop-e-road-bike', NULL, false)
ON CONFLICT (tag) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Private helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.workshop_ok(p_task public.bike_tasks)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'ok', true,
    'taskId', p_task.id,
    'version', p_task.version,
    'status', p_task.status::text
  );
$$;

CREATE OR REPLACE FUNCTION private.workshop_err(p_code text, p_error text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT jsonb_build_object('ok', false, 'code', p_code, 'error', p_error);
$$;

CREATE OR REPLACE FUNCTION private.workshop_item_m1_valid(p_item public.bike_task_items)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN NOT p_item.required THEN true
    WHEN p_item.m1_outcome = 'not_applicable'::public.checklist_item_outcome THEN p_item.na_allowed
    WHEN p_item.m1_outcome = 'completed'::public.checklist_item_outcome
      AND p_item.item_type = 'tyre_pressure_psi'::public.checklist_item_type
      THEN p_item.m1_psi IS NOT NULL
    WHEN p_item.m1_outcome = 'completed'::public.checklist_item_outcome THEN true
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION private.workshop_copy_definition_items(
  p_task_id uuid,
  p_definition_id uuid,
  p_stage public.bike_task_item_stage
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.bike_task_items (
    task_id, stage, item_key, sort_order, label, item_type,
    required, m2_verifies, na_allowed, definition_id, definition_item_id
  )
  SELECT
    p_task_id,
    p_stage,
    di.item_key,
    di.sort_order,
    di.label,
    di.item_type,
    di.required,
    di.m2_verifies,
    di.na_allowed,
    di.definition_id,
    di.id
  FROM public.checklist_definition_items di
  WHERE di.definition_id = p_definition_id
  ON CONFLICT (task_id, stage, item_key) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION private.workshop_record_event(
  p_task_id uuid,
  p_event_kind text,
  p_from public.bike_task_status,
  p_to public.bike_task_status,
  p_version integer,
  p_actor_id uuid,
  p_first text,
  p_last text,
  p_source_fingerprint text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.bike_task_events (
    task_id, event_kind, from_status, to_status, resulting_version,
    source, actor_id, actor_first_name, actor_last_name, source_fingerprint
  ) VALUES (
    p_task_id, p_event_kind, p_from, p_to, p_version,
    'staff_command', p_actor_id, p_first, p_last, p_source_fingerprint
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.workshop_bump_task(
  p_task_id uuid,
  p_status public.bike_task_status
)
RETURNS public.bike_tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_task public.bike_tasks;
BEGIN
  UPDATE public.bike_tasks
  SET version = version + 1,
      status = p_status,
      updated_at = now()
  WHERE id = p_task_id
  RETURNING * INTO v_task;
  RETURN v_task;
END;
$$;

CREATE OR REPLACE FUNCTION private.workshop_begin_command(
  p_task_id uuid,
  p_expected_version integer,
  p_lock_order boolean DEFAULT false
)
RETURNS private.workshop_begin_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r private.workshop_begin_result;
  v_role public.user_role;
  v_order_id uuid;
  v_user_id uuid;
  v_first text;
  v_last text;
  v_task public.bike_tasks;
BEGIN
  v_role := public.get_user_role();
  IF v_role IS NULL OR v_role NOT IN (
    'admin'::public.user_role,
    'manager'::public.user_role,
    'mechanic'::public.user_role
  ) THEN
    r.err := private.workshop_err('FORBIDDEN', 'Staff role required.');
    RETURN r;
  END IF;

  SELECT p.id, p.first_name, p.last_name
  INTO v_user_id, v_first, v_last
  FROM public.profiles p
  WHERE p.id = (SELECT auth.uid());

  IF v_user_id IS NULL THEN
    r.err := private.workshop_err('FORBIDDEN', 'Staff role required.');
    RETURN r;
  END IF;

  r.user_id := v_user_id;
  r.first_name := v_first;
  r.last_name := v_last;

  IF p_lock_order THEN
    SELECT t.order_id INTO v_order_id
    FROM public.bike_tasks t
    WHERE t.id = p_task_id;
    IF v_order_id IS NOT NULL THEN
      PERFORM 1 FROM public.orders o WHERE o.id = v_order_id FOR UPDATE;
    END IF;
  END IF;

  SELECT * INTO v_task
  FROM public.bike_tasks t
  WHERE t.id = p_task_id
  FOR UPDATE;

  IF NOT FOUND THEN
    r.err := private.workshop_err('INVALID_TRANSITION', 'Task not found.');
    RETURN r;
  END IF;

  r.task_id := v_task.id;
  r.status := v_task.status;
  r.version := v_task.version;
  r.order_id := v_task.order_id;
  r.workshop_tag := v_task.workshop_tag;
  r.has_configuration_warning := v_task.has_configuration_warning;
  r.selected_definition_id := v_task.selected_definition_id;

  IF v_task.status = 'cancelled'::public.bike_task_status THEN
    r.err := private.workshop_err('TASK_CANCELLED', 'This task is cancelled.');
    RETURN r;
  END IF;

  IF p_expected_version IS NULL OR v_task.version IS DISTINCT FROM p_expected_version THEN
    r.err := private.workshop_err('STALE_VERSION', 'Task version does not match.');
    RETURN r;
  END IF;

  RETURN r;
END;
$$;

CREATE OR REPLACE FUNCTION private.workshop_profile_names_ok(p_first text, p_last text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT p_first IS NOT NULL AND btrim(p_first) <> ''
     AND p_last IS NOT NULL AND btrim(p_last) <> '';
$$;

CREATE OR REPLACE FUNCTION private.workshop_preparation_ready(p_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.bike_task_items i
    WHERE i.task_id = p_task_id
      AND i.stage = 'preparation'::public.bike_task_item_stage
      AND NOT private.workshop_item_m1_valid(i)
  );
$$;

CREATE OR REPLACE FUNCTION private.workshop_m2_ready(p_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.bike_task_items i
    WHERE i.task_id = p_task_id
      AND i.stage = 'preparation'::public.bike_task_item_stage
      AND i.m2_verifies
      AND (
        NOT private.workshop_item_m1_valid(i)
        OR i.m2_confirmed IS NOT TRUE
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.workshop_storage_ready(p_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bike_task_items i
    WHERE i.task_id = p_task_id
      AND i.stage = 'storage'::public.bike_task_item_stage
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.bike_task_items i
    WHERE i.task_id = p_task_id
      AND i.stage = 'storage'::public.bike_task_item_stage
      AND NOT private.workshop_item_m1_valid(i)
  );
$$;

-- ---------------------------------------------------------------------------
-- Staff commands
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.workshop_start_preparation(
  p_task_id uuid,
  p_expected_version integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ctx private.workshop_begin_result;
  v_enabled boolean;
  v_map_def uuid;
  v_task public.bike_tasks;
BEGIN
  v_ctx := private.workshop_begin_command(p_task_id, p_expected_version, false);
  IF v_ctx.err IS NOT NULL THEN
    RETURN v_ctx.err;
  END IF;

  IF v_ctx.status <> 'to_prepare'::public.bike_task_status THEN
    RETURN private.workshop_err('INVALID_TRANSITION', 'Preparation can only start from To Prepare.');
  END IF;

  SELECT m.enabled, m.definition_id
  INTO v_enabled, v_map_def
  FROM public.checklist_tag_mappings m
  WHERE m.tag = v_ctx.workshop_tag;

  IF v_ctx.has_configuration_warning
     OR v_ctx.workshop_tag IS NULL
     OR v_enabled IS DISTINCT FROM true
     OR v_map_def IS NULL
     OR v_ctx.selected_definition_id IS NULL
     OR v_ctx.selected_definition_id IS DISTINCT FROM v_map_def
     OR NOT EXISTS (
       SELECT 1 FROM public.bike_task_items i
       WHERE i.task_id = v_ctx.task_id
         AND i.stage = 'preparation'::public.bike_task_item_stage
     )
  THEN
    RETURN private.workshop_err(
      'CONFIGURATION_BLOCKED',
      'This bike has no recognized workshop checklist.'
    );
  END IF;

  v_task := private.workshop_bump_task(v_ctx.task_id, 'being_prepared');
  PERFORM private.workshop_record_event(
    v_task.id, 'transition', v_ctx.status, v_task.status, v_task.version,
    v_ctx.user_id, v_ctx.first_name, v_ctx.last_name, NULL
  );
  RETURN private.workshop_ok(v_task);
END;
$$;

CREATE OR REPLACE FUNCTION private.workshop_set_item_outcome(
  p_task_id uuid,
  p_expected_version integer,
  p_item_id uuid,
  p_outcome text,
  p_psi numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ctx private.workshop_begin_result;
  v_item public.bike_task_items;
  v_outcome public.checklist_item_outcome;
  v_task public.bike_tasks;
  v_expected_stage public.bike_task_item_stage;
BEGIN
  v_ctx := private.workshop_begin_command(p_task_id, p_expected_version, false);
  IF v_ctx.err IS NOT NULL THEN
    RETURN v_ctx.err;
  END IF;

  SELECT * INTO v_item
  FROM public.bike_task_items i
  WHERE i.id = p_item_id AND i.task_id = v_ctx.task_id
  FOR UPDATE;

  IF v_item.id IS NULL THEN
    RETURN private.workshop_err('INVALID_TRANSITION', 'Checklist item not found.');
  END IF;

  IF v_ctx.status = 'being_prepared'::public.bike_task_status THEN
    v_expected_stage := 'preparation';
  ELSIF v_ctx.status = 'prepare_for_storage'::public.bike_task_status THEN
    v_expected_stage := 'storage';
  ELSE
    RETURN private.workshop_err('INVALID_TRANSITION', 'Items cannot be updated in this status.');
  END IF;

  IF v_item.stage <> v_expected_stage THEN
    RETURN private.workshop_err('INVALID_TRANSITION', 'Item is not part of the current stage.');
  END IF;

  IF p_outcome IS NULL OR p_outcome NOT IN ('completed', 'not_applicable') THEN
    RETURN private.workshop_err('INCOMPLETE_CHECKLIST', 'Outcome must be completed or not applicable.');
  END IF;

  v_outcome := p_outcome::public.checklist_item_outcome;

  IF v_outcome = 'not_applicable'::public.checklist_item_outcome AND NOT v_item.na_allowed THEN
    RETURN private.workshop_err('INCOMPLETE_CHECKLIST', 'This item does not allow N/A.');
  END IF;

  IF v_outcome = 'completed'::public.checklist_item_outcome
     AND v_item.item_type = 'tyre_pressure_psi'::public.checklist_item_type
     AND (p_psi IS NULL OR p_psi <= 0) THEN
    RETURN private.workshop_err('INCOMPLETE_CHECKLIST', 'PSI value is required.');
  END IF;

  UPDATE public.bike_task_items
  SET m1_outcome = v_outcome,
      m1_psi = CASE
        WHEN v_outcome = 'not_applicable'::public.checklist_item_outcome THEN NULL
        WHEN v_item.item_type = 'tyre_pressure_psi'::public.checklist_item_type THEN p_psi
        ELSE NULL
      END,
      updated_at = now()
  WHERE id = v_item.id;

  v_task := private.workshop_bump_task(v_ctx.task_id, v_ctx.status);
  PERFORM private.workshop_record_event(
    v_task.id, 'item_outcome', v_task.status, v_task.status, v_task.version,
    v_ctx.user_id, v_ctx.first_name, v_ctx.last_name, NULL
  );
  RETURN private.workshop_ok(v_task);
END;
$$;

CREATE OR REPLACE FUNCTION private.workshop_confirm_m2_item(
  p_task_id uuid,
  p_expected_version integer,
  p_item_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ctx private.workshop_begin_result;
  v_item public.bike_task_items;
  v_task public.bike_tasks;
BEGIN
  v_ctx := private.workshop_begin_command(p_task_id, p_expected_version, false);
  IF v_ctx.err IS NOT NULL THEN
    RETURN v_ctx.err;
  END IF;

  IF v_ctx.status <> 'needs_recheck'::public.bike_task_status THEN
    RETURN private.workshop_err('INVALID_TRANSITION', 'M2 confirmation is only allowed during re-check.');
  END IF;

  SELECT * INTO v_item
  FROM public.bike_task_items i
  WHERE i.id = p_item_id AND i.task_id = v_ctx.task_id
  FOR UPDATE;

  IF v_item.id IS NULL OR v_item.stage <> 'preparation'::public.bike_task_item_stage THEN
    RETURN private.workshop_err('INVALID_TRANSITION', 'Checklist item not found.');
  END IF;

  IF NOT v_item.m2_verifies THEN
    RETURN private.workshop_err('INVALID_TRANSITION', 'This item is not designated for M2.');
  END IF;

  IF NOT private.workshop_item_m1_valid(v_item) THEN
    RETURN private.workshop_err('INCOMPLETE_CHECKLIST', 'M1 outcome must be valid before M2 confirmation.');
  END IF;

  UPDATE public.bike_task_items
  SET m2_confirmed = true,
      updated_at = now()
  WHERE id = v_item.id;

  v_task := private.workshop_bump_task(v_ctx.task_id, v_ctx.status);
  PERFORM private.workshop_record_event(
    v_task.id, 'm2_confirmed', v_task.status, v_task.status, v_task.version,
    v_ctx.user_id, v_ctx.first_name, v_ctx.last_name, NULL
  );
  RETURN private.workshop_ok(v_task);
END;
$$;

CREATE OR REPLACE FUNCTION private.workshop_complete_m1(
  p_task_id uuid,
  p_expected_version integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ctx private.workshop_begin_result;
  v_task public.bike_tasks;
BEGIN
  v_ctx := private.workshop_begin_command(p_task_id, p_expected_version, false);
  IF v_ctx.err IS NOT NULL THEN
    RETURN v_ctx.err;
  END IF;

  IF v_ctx.status <> 'being_prepared'::public.bike_task_status THEN
    RETURN private.workshop_err('INVALID_TRANSITION', 'M1 can only complete from Being Prepared.');
  END IF;

  IF NOT private.workshop_profile_names_ok(v_ctx.first_name, v_ctx.last_name) THEN
    RETURN private.workshop_err('PROFILE_NAME_REQUIRED', 'First and last name are required to sign.');
  END IF;

  IF NOT private.workshop_preparation_ready(v_ctx.task_id) THEN
    RETURN private.workshop_err('INCOMPLETE_CHECKLIST', 'Required preparation items are incomplete.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bike_task_attestations a
    WHERE a.task_id = v_ctx.task_id AND a.stage = 'm1'::public.bike_task_attestation_stage
  ) THEN
    RETURN private.workshop_err('INVALID_TRANSITION', 'M1 is already attested.');
  END IF;

  INSERT INTO public.bike_task_attestations (
    task_id, stage, user_id, first_name, last_name
  ) VALUES (
    v_ctx.task_id,
    'm1',
    v_ctx.user_id,
    btrim(v_ctx.first_name),
    btrim(v_ctx.last_name)
  );

  v_task := private.workshop_bump_task(v_ctx.task_id, 'needs_recheck');
  PERFORM private.workshop_record_event(
    v_task.id, 'transition', v_ctx.status, v_task.status, v_task.version,
    v_ctx.user_id, v_ctx.first_name, v_ctx.last_name, NULL
  );
  RETURN private.workshop_ok(v_task);
END;
$$;

CREATE OR REPLACE FUNCTION private.workshop_complete_m2(
  p_task_id uuid,
  p_expected_version integer,
  p_expected_addon_fingerprint text,
  p_same_person_confirmed boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ctx private.workshop_begin_result;
  v_task public.bike_tasks;
  v_order public.orders;
  v_m1_user uuid;
  v_same boolean;
  v_addons jsonb;
BEGIN
  v_ctx := private.workshop_begin_command(p_task_id, p_expected_version, true);
  IF v_ctx.err IS NOT NULL THEN
    RETURN v_ctx.err;
  END IF;

  IF v_ctx.status <> 'needs_recheck'::public.bike_task_status THEN
    RETURN private.workshop_err('INVALID_TRANSITION', 'M2 can only complete from Needs Re-check.');
  END IF;

  IF NOT private.workshop_profile_names_ok(v_ctx.first_name, v_ctx.last_name) THEN
    RETURN private.workshop_err('PROFILE_NAME_REQUIRED', 'First and last name are required to sign.');
  END IF;

  IF NOT private.workshop_m2_ready(v_ctx.task_id) THEN
    RETURN private.workshop_err('INCOMPLETE_CHECKLIST', 'Designated M2 items are not all confirmed.');
  END IF;

  SELECT * INTO v_order
  FROM public.orders o
  WHERE o.id = v_ctx.order_id
  FOR UPDATE;

  IF v_order.addon_fingerprint IS DISTINCT FROM p_expected_addon_fingerprint THEN
    RETURN private.workshop_err('ADD_ONS_CHANGED', 'Add-ons changed; confirm the current set.');
  END IF;

  SELECT a.user_id INTO v_m1_user
  FROM public.bike_task_attestations a
  WHERE a.task_id = v_ctx.task_id AND a.stage = 'm1'::public.bike_task_attestation_stage;

  IF v_m1_user IS NOT NULL
     AND v_m1_user = v_ctx.user_id
     AND NOT COALESCE(p_same_person_confirmed, false) THEN
    RETURN private.workshop_err(
      'FORBIDDEN',
      'Same-person re-check requires explicit confirmation.'
    );
  END IF;

  v_same := COALESCE(v_m1_user = v_ctx.user_id AND p_same_person_confirmed, false);

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', oi.id,
        'title', oi.title,
        'quantity', oi.quantity,
        'lineType', oi.line_type
      )
      ORDER BY oi.position NULLS LAST, oi.id
    ),
    '[]'::jsonb
  )
  INTO v_addons
  FROM public.order_items oi
  WHERE oi.order_id = v_ctx.order_id;

  IF EXISTS (
    SELECT 1 FROM public.bike_task_attestations a
    WHERE a.task_id = v_ctx.task_id AND a.stage = 'm2'::public.bike_task_attestation_stage
  ) THEN
    RETURN private.workshop_err('INVALID_TRANSITION', 'M2 is already attested.');
  END IF;

  INSERT INTO public.bike_task_attestations (
    task_id, stage, user_id, first_name, last_name,
    same_person_confirmed, addon_snapshot, addon_fingerprint
  ) VALUES (
    v_ctx.task_id,
    'm2',
    v_ctx.user_id,
    btrim(v_ctx.first_name),
    btrim(v_ctx.last_name),
    v_same,
    v_addons,
    v_order.addon_fingerprint
  );

  v_task := private.workshop_bump_task(v_ctx.task_id, 'ready_for_pickup');
  PERFORM private.workshop_record_event(
    v_task.id, 'transition', v_ctx.status, v_task.status, v_task.version,
    v_ctx.user_id, v_ctx.first_name, v_ctx.last_name, v_order.source_fingerprint
  );
  RETURN private.workshop_ok(v_task);
END;
$$;

CREATE OR REPLACE FUNCTION private.workshop_simple_transition(
  p_task_id uuid,
  p_expected_version integer,
  p_from public.bike_task_status,
  p_to public.bike_task_status,
  p_message text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ctx private.workshop_begin_result;
  v_task public.bike_tasks;
BEGIN
  v_ctx := private.workshop_begin_command(p_task_id, p_expected_version, false);
  IF v_ctx.err IS NOT NULL THEN
    RETURN v_ctx.err;
  END IF;

  IF v_ctx.status <> p_from THEN
    RETURN private.workshop_err('INVALID_TRANSITION', p_message);
  END IF;

  v_task := private.workshop_bump_task(v_ctx.task_id, p_to);
  PERFORM private.workshop_record_event(
    v_task.id, 'transition', v_ctx.status, v_task.status, v_task.version,
    v_ctx.user_id, v_ctx.first_name, v_ctx.last_name, NULL
  );
  RETURN private.workshop_ok(v_task);
END;
$$;

CREATE OR REPLACE FUNCTION private.workshop_mark_picked_up(
  p_task_id uuid,
  p_expected_version integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN private.workshop_simple_transition(
    p_task_id,
    p_expected_version,
    'ready_for_pickup',
    'in_rental',
    'Pickup is only allowed from Ready for Pickup.'
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.workshop_mark_returned(
  p_task_id uuid,
  p_expected_version integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN private.workshop_simple_transition(
    p_task_id,
    p_expected_version,
    'in_rental',
    'returned',
    'Return is only allowed from In Rental.'
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.workshop_start_storage(
  p_task_id uuid,
  p_expected_version integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ctx private.workshop_begin_result;
  v_task public.bike_tasks;
  v_def uuid;
BEGIN
  v_ctx := private.workshop_begin_command(p_task_id, p_expected_version, false);
  IF v_ctx.err IS NOT NULL THEN
    RETURN v_ctx.err;
  END IF;

  IF v_ctx.status <> 'returned'::public.bike_task_status THEN
    RETURN private.workshop_err('INVALID_TRANSITION', 'Storage can only start from Returned.');
  END IF;

  SELECT d.id INTO v_def
  FROM public.checklist_definitions d
  WHERE d.definition_key = 'prepare_for_storage'
  ORDER BY d.version DESC
  LIMIT 1;

  IF v_def IS NULL THEN
    RETURN private.workshop_err('CONFIGURATION_BLOCKED', 'Storage checklist is not configured.');
  END IF;

  PERFORM private.workshop_copy_definition_items(
    v_ctx.task_id, v_def, 'storage'::public.bike_task_item_stage
  );

  IF NOT EXISTS (
    SELECT 1
    FROM public.bike_task_items i
    WHERE i.task_id = v_ctx.task_id
      AND i.stage = 'storage'::public.bike_task_item_stage
  ) THEN
    RETURN private.workshop_err(
      'CONFIGURATION_BLOCKED',
      'Storage checklist is not configured.'
    );
  END IF;

  v_task := private.workshop_bump_task(v_ctx.task_id, 'prepare_for_storage');
  PERFORM private.workshop_record_event(
    v_task.id, 'transition', v_ctx.status, v_task.status, v_task.version,
    v_ctx.user_id, v_ctx.first_name, v_ctx.last_name, NULL
  );
  RETURN private.workshop_ok(v_task);
END;
$$;

CREATE OR REPLACE FUNCTION private.workshop_complete_storage(
  p_task_id uuid,
  p_expected_version integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ctx private.workshop_begin_result;
  v_task public.bike_tasks;
BEGIN
  v_ctx := private.workshop_begin_command(p_task_id, p_expected_version, false);
  IF v_ctx.err IS NOT NULL THEN
    RETURN v_ctx.err;
  END IF;

  IF v_ctx.status <> 'prepare_for_storage'::public.bike_task_status THEN
    RETURN private.workshop_err('INVALID_TRANSITION', 'Storage can only complete from Prepare for Storage.');
  END IF;

  IF NOT private.workshop_profile_names_ok(v_ctx.first_name, v_ctx.last_name) THEN
    RETURN private.workshop_err('PROFILE_NAME_REQUIRED', 'First and last name are required to sign.');
  END IF;

  IF NOT private.workshop_storage_ready(v_ctx.task_id) THEN
    RETURN private.workshop_err('INCOMPLETE_CHECKLIST', 'Required storage items are incomplete.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bike_task_attestations a
    WHERE a.task_id = v_ctx.task_id AND a.stage = 'storage'::public.bike_task_attestation_stage
  ) THEN
    RETURN private.workshop_err('INVALID_TRANSITION', 'Storage is already attested.');
  END IF;

  INSERT INTO public.bike_task_attestations (
    task_id, stage, user_id, first_name, last_name
  ) VALUES (
    v_ctx.task_id,
    'storage',
    v_ctx.user_id,
    btrim(v_ctx.first_name),
    btrim(v_ctx.last_name)
  );

  v_task := private.workshop_bump_task(v_ctx.task_id, 'completed');
  PERFORM private.workshop_record_event(
    v_task.id, 'transition', v_ctx.status, v_task.status, v_task.version,
    v_ctx.user_id, v_ctx.first_name, v_ctx.last_name, NULL
  );
  RETURN private.workshop_ok(v_task);
END;
$$;

-- ---------------------------------------------------------------------------
-- Read models
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.workshop_task_progress_stage(
  p_status public.bike_task_status
)
RETURNS public.bike_task_item_stage
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_status IN (
      'prepare_for_storage'::public.bike_task_status,
      'completed'::public.bike_task_status
    ) THEN 'storage'::public.bike_task_item_stage
    ELSE 'preparation'::public.bike_task_item_stage
  END;
$$;

CREATE OR REPLACE VIEW public.workshop_tasks_view
WITH (security_invoker = true) AS
SELECT
  t.id AS task_id,
  t.version,
  t.status,
  t.order_id,
  t.order_number,
  (t.order_number)::text AS order_number_text,
  t.starts_at,
  ((t.starts_at AT TIME ZONE 'Europe/Madrid')::date) AS madrid_start_date,
  t.booqable_stock_item_id AS bike_source_id,
  t.bike_display_id,
  t.bike_title,
  t.workshop_tag,
  t.has_configuration_warning,
  COALESCE(p.items_completed, 0) AS items_completed,
  COALESCE(p.items_total, 0) AS items_total
FROM public.bike_tasks t
LEFT JOIN LATERAL (
  SELECT
    count(*) FILTER (WHERE i.required AND private.workshop_item_m1_valid(i))::integer AS items_completed,
    count(*) FILTER (WHERE i.required)::integer AS items_total
  FROM public.bike_task_items i
  WHERE i.task_id = t.id
    AND i.stage = private.workshop_task_progress_stage(t.status)
) p ON true;

CREATE OR REPLACE FUNCTION private.workshop_task_detail(p_task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role public.user_role;
  v_task public.bike_tasks;
  v_order public.orders;
  v_progress record;
BEGIN
  v_role := public.get_user_role();
  IF v_role IS NULL OR v_role NOT IN (
    'admin'::public.user_role,
    'manager'::public.user_role,
    'mechanic'::public.user_role
  ) THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_task FROM public.bike_tasks t WHERE t.id = p_task_id;
  IF v_task.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_order FROM public.orders o WHERE o.id = v_task.order_id;

  SELECT
    count(*) FILTER (WHERE i.required AND private.workshop_item_m1_valid(i))::integer AS items_completed,
    count(*) FILTER (WHERE i.required)::integer AS items_total
  INTO v_progress
  FROM public.bike_task_items i
  WHERE i.task_id = v_task.id
    AND i.stage = private.workshop_task_progress_stage(v_task.status);

  RETURN jsonb_build_object(
    'task', jsonb_build_object(
      'task_id', v_task.id,
      'version', v_task.version,
      'status', v_task.status::text,
      'order_id', v_task.order_id,
      'order_number', v_task.order_number,
      'starts_at', v_task.starts_at,
      'madrid_start_date', ((v_task.starts_at AT TIME ZONE 'Europe/Madrid')::date),
      'bike_source_id', v_task.booqable_stock_item_id,
      'bike_display_id', v_task.bike_display_id,
      'bike_title', v_task.bike_title,
      'workshop_tag', v_task.workshop_tag,
      'has_configuration_warning', v_task.has_configuration_warning,
      'items_completed', COALESCE(v_progress.items_completed, 0),
      'items_total', COALESCE(v_progress.items_total, 0)
    ),
    'items', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'itemId', i.id,
          'stage', i.stage::text,
          'itemKey', i.item_key,
          'sortOrder', i.sort_order,
          'label', i.label,
          'itemType', i.item_type::text,
          'required', i.required,
          'm2Verifies', i.m2_verifies,
          'naAllowed', i.na_allowed,
          'm1Outcome', i.m1_outcome::text,
          'm1Psi', i.m1_psi,
          'm2Confirmed', i.m2_confirmed
        )
        ORDER BY i.stage, i.sort_order
      )
      FROM public.bike_task_items i
      WHERE i.task_id = v_task.id
    ), '[]'::jsonb),
    'addons', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', oi.id,
          'title', oi.title,
          'quantity', oi.quantity,
          'lineType', oi.line_type
        )
        ORDER BY oi.position NULLS LAST, oi.id
      )
      FROM public.order_items oi
      WHERE oi.order_id = v_task.order_id
    ), '[]'::jsonb),
    'addonFingerprint', v_order.addon_fingerprint,
    'sourceFingerprint', v_order.source_fingerprint,
    'attestations', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'stage', a.stage::text,
          'userId', a.user_id,
          'firstName', a.first_name,
          'lastName', a.last_name,
          'signedAt', a.signed_at,
          'samePersonConfirmed', a.same_person_confirmed,
          'addonFingerprint', a.addon_fingerprint
        )
        ORDER BY a.signed_at
      )
      FROM public.bike_task_attestations a
      WHERE a.task_id = v_task.id
    ), '[]'::jsonb),
    'events', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'eventKind', e.event_kind,
          'fromStatus', e.from_status::text,
          'toStatus', e.to_status::text,
          'resultingVersion', e.resulting_version,
          'source', e.source,
          'actorId', e.actor_id,
          'actorFirstName', e.actor_first_name,
          'actorLastName', e.actor_last_name,
          'occurredAt', e.occurred_at
        )
        ORDER BY e.occurred_at, e.resulting_version
      )
      FROM public.bike_task_events e
      WHERE e.task_id = v_task.id
    ), '[]'::jsonb)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Public SECURITY INVOKER wrappers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.workshop_set_item_outcome(
  task_id uuid,
  expected_version integer,
  item_id uuid,
  outcome text,
  psi numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN private.workshop_set_item_outcome(task_id, expected_version, item_id, outcome, psi);
END;
$$;

CREATE OR REPLACE FUNCTION public.workshop_confirm_m2_item(
  task_id uuid,
  expected_version integer,
  item_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN private.workshop_confirm_m2_item(task_id, expected_version, item_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.workshop_start_preparation(
  task_id uuid,
  expected_version integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN private.workshop_start_preparation(task_id, expected_version);
END;
$$;

CREATE OR REPLACE FUNCTION public.workshop_complete_m1(
  task_id uuid,
  expected_version integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN private.workshop_complete_m1(task_id, expected_version);
END;
$$;

CREATE OR REPLACE FUNCTION public.workshop_complete_m2(
  task_id uuid,
  expected_version integer,
  expected_addon_fingerprint text,
  same_person_confirmed boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN private.workshop_complete_m2(
    task_id, expected_version, expected_addon_fingerprint, same_person_confirmed
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.workshop_mark_picked_up(
  task_id uuid,
  expected_version integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN private.workshop_mark_picked_up(task_id, expected_version);
END;
$$;

CREATE OR REPLACE FUNCTION public.workshop_mark_returned(
  task_id uuid,
  expected_version integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN private.workshop_mark_returned(task_id, expected_version);
END;
$$;

CREATE OR REPLACE FUNCTION public.workshop_start_storage(
  task_id uuid,
  expected_version integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN private.workshop_start_storage(task_id, expected_version);
END;
$$;

CREATE OR REPLACE FUNCTION public.workshop_complete_storage(
  task_id uuid,
  expected_version integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN private.workshop_complete_storage(task_id, expected_version);
END;
$$;

CREATE OR REPLACE FUNCTION public.workshop_task_detail(task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN private.workshop_task_detail(task_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants and RLS
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION private.workshop_reject_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.workshop_ok(public.bike_tasks) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.workshop_err(text, text) FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE (n.nspname = 'private' AND p.proname LIKE 'workshop%')
       OR (n.nspname = 'public' AND p.proname LIKE 'workshop%')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC', r.schema, r.proname, r.args);
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM anon', r.schema, r.proname, r.args);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION private.workshop_set_item_outcome(uuid, integer, uuid, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION private.workshop_confirm_m2_item(uuid, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.workshop_start_preparation(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION private.workshop_complete_m1(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION private.workshop_complete_m2(uuid, integer, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION private.workshop_mark_picked_up(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION private.workshop_mark_returned(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION private.workshop_start_storage(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION private.workshop_complete_storage(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION private.workshop_task_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.workshop_item_m1_valid(public.bike_task_items) TO authenticated;
GRANT EXECUTE ON FUNCTION private.workshop_task_progress_stage(public.bike_task_status) TO authenticated;

GRANT EXECUTE ON FUNCTION public.workshop_set_item_outcome(uuid, integer, uuid, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workshop_confirm_m2_item(uuid, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workshop_start_preparation(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workshop_complete_m1(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workshop_complete_m2(uuid, integer, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workshop_mark_picked_up(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workshop_mark_returned(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workshop_start_storage(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workshop_complete_storage(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workshop_task_detail(uuid) TO authenticated;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'checklist_definitions',
    'checklist_definition_items',
    'checklist_tag_mappings',
    'booqable_assignment_instances',
    'bike_tasks',
    'bike_task_items',
    'bike_task_events',
    'bike_task_attestations'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', t);
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
  END LOOP;
END $$;

REVOKE ALL ON TABLE public.workshop_tasks_view FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.workshop_tasks_view TO authenticated;
GRANT ALL ON TABLE public.workshop_tasks_view TO service_role;

DROP POLICY IF EXISTS "Staff can read checklist definitions" ON public.checklist_definitions;
CREATE POLICY "Staff can read checklist definitions"
  ON public.checklist_definitions FOR SELECT TO authenticated
  USING (public.get_user_role() = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role, 'mechanic'::public.user_role]));

DROP POLICY IF EXISTS "Staff can read checklist definition items" ON public.checklist_definition_items;
CREATE POLICY "Staff can read checklist definition items"
  ON public.checklist_definition_items FOR SELECT TO authenticated
  USING (public.get_user_role() = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role, 'mechanic'::public.user_role]));

DROP POLICY IF EXISTS "Staff can read checklist tag mappings" ON public.checklist_tag_mappings;
CREATE POLICY "Staff can read checklist tag mappings"
  ON public.checklist_tag_mappings FOR SELECT TO authenticated
  USING (public.get_user_role() = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role, 'mechanic'::public.user_role]));

DROP POLICY IF EXISTS "Staff can read assignment instances" ON public.booqable_assignment_instances;
CREATE POLICY "Staff can read assignment instances"
  ON public.booqable_assignment_instances FOR SELECT TO authenticated
  USING (public.get_user_role() = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role, 'mechanic'::public.user_role]));

DROP POLICY IF EXISTS "Staff can read bike tasks" ON public.bike_tasks;
CREATE POLICY "Staff can read bike tasks"
  ON public.bike_tasks FOR SELECT TO authenticated
  USING (public.get_user_role() = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role, 'mechanic'::public.user_role]));

DROP POLICY IF EXISTS "Staff can read bike task items" ON public.bike_task_items;
CREATE POLICY "Staff can read bike task items"
  ON public.bike_task_items FOR SELECT TO authenticated
  USING (public.get_user_role() = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role, 'mechanic'::public.user_role]));

DROP POLICY IF EXISTS "Staff can read bike task events" ON public.bike_task_events;
CREATE POLICY "Staff can read bike task events"
  ON public.bike_task_events FOR SELECT TO authenticated
  USING (public.get_user_role() = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role, 'mechanic'::public.user_role]));

DROP POLICY IF EXISTS "Staff can read bike task attestations" ON public.bike_task_attestations;
CREATE POLICY "Staff can read bike task attestations"
  ON public.bike_task_attestations FOR SELECT TO authenticated
  USING (public.get_user_role() = ANY (ARRAY['admin'::public.user_role, 'manager'::public.user_role, 'mechanic'::public.user_role]));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'bike_tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bike_tasks;
  END IF;
END $$;
