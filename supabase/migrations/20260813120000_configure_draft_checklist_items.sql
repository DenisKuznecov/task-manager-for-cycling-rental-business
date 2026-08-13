-- Draft checklist item definitions. Authenticated roles keep SELECT-only
-- access; writes go through SECURITY DEFINER RPCs that authorize
-- Admin/Manager, require status='draft', match expected_revision, lock
-- (bike_category, phase), increment revision, and write an attributed event.

CREATE TABLE IF NOT EXISTS public.workshop_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES public.workshop_checklist_versions(id)
    ON DELETE RESTRICT,
  label text NOT NULL,
  position integer NOT NULL,
  item_type text NOT NULL,
  required boolean NOT NULL,
  m1 boolean NOT NULL,
  m2 boolean NOT NULL,
  setup_category text
);

ALTER TABLE public.workshop_checklist_items
  ADD COLUMN IF NOT EXISTS version_id uuid;
ALTER TABLE public.workshop_checklist_items
  ADD COLUMN IF NOT EXISTS label text;
ALTER TABLE public.workshop_checklist_items
  ADD COLUMN IF NOT EXISTS position integer;
ALTER TABLE public.workshop_checklist_items
  ADD COLUMN IF NOT EXISTS item_type text;
ALTER TABLE public.workshop_checklist_items
  ADD COLUMN IF NOT EXISTS required boolean;
ALTER TABLE public.workshop_checklist_items
  ADD COLUMN IF NOT EXISTS m1 boolean;
ALTER TABLE public.workshop_checklist_items
  ADD COLUMN IF NOT EXISTS m2 boolean;
ALTER TABLE public.workshop_checklist_items
  ADD COLUMN IF NOT EXISTS setup_category text;

ALTER TABLE public.workshop_checklist_items
  DROP CONSTRAINT IF EXISTS workshop_checklist_items_version_id_fkey;
ALTER TABLE public.workshop_checklist_items
  ADD CONSTRAINT workshop_checklist_items_version_id_fkey
  FOREIGN KEY (version_id) REFERENCES public.workshop_checklist_versions(id)
  ON DELETE RESTRICT;

ALTER TABLE public.workshop_checklist_items
  ALTER COLUMN version_id SET NOT NULL;
ALTER TABLE public.workshop_checklist_items
  ALTER COLUMN label SET NOT NULL;
ALTER TABLE public.workshop_checklist_items
  ALTER COLUMN position SET NOT NULL;
ALTER TABLE public.workshop_checklist_items
  ALTER COLUMN item_type SET NOT NULL;
ALTER TABLE public.workshop_checklist_items
  ALTER COLUMN required SET NOT NULL;
ALTER TABLE public.workshop_checklist_items
  ALTER COLUMN m1 SET NOT NULL;
ALTER TABLE public.workshop_checklist_items
  ALTER COLUMN m2 SET NOT NULL;

ALTER TABLE public.workshop_checklist_items
  DROP CONSTRAINT IF EXISTS workshop_checklist_items_label_not_blank;
ALTER TABLE public.workshop_checklist_items
  ADD CONSTRAINT workshop_checklist_items_label_not_blank
  CHECK (char_length(btrim(label)) > 0);

ALTER TABLE public.workshop_checklist_items
  DROP CONSTRAINT IF EXISTS workshop_checklist_items_position_positive;
ALTER TABLE public.workshop_checklist_items
  ADD CONSTRAINT workshop_checklist_items_position_positive
  CHECK (position > 0);

ALTER TABLE public.workshop_checklist_items
  DROP CONSTRAINT IF EXISTS workshop_checklist_items_item_type_check;
ALTER TABLE public.workshop_checklist_items
  ADD CONSTRAINT workshop_checklist_items_item_type_check
  CHECK (item_type IN ('action', 'value'));

ALTER TABLE public.workshop_checklist_items
  DROP CONSTRAINT IF EXISTS workshop_checklist_items_m2_implies_m1;
ALTER TABLE public.workshop_checklist_items
  ADD CONSTRAINT workshop_checklist_items_m2_implies_m1
  CHECK (NOT m2 OR m1);

ALTER TABLE public.workshop_checklist_items
  DROP CONSTRAINT IF EXISTS workshop_checklist_items_setup_category_check;
ALTER TABLE public.workshop_checklist_items
  ADD CONSTRAINT workshop_checklist_items_setup_category_check
  CHECK (
    setup_category IS NULL OR setup_category IN (
      'pedals',
      'saddle',
      'wheelset',
      'power-meter',
      'computer-mount'
    )
  );

ALTER TABLE public.workshop_checklist_items
  DROP CONSTRAINT IF EXISTS workshop_checklist_items_version_id_position_key;
ALTER TABLE public.workshop_checklist_items
  ADD CONSTRAINT workshop_checklist_items_version_id_position_key
  UNIQUE (version_id, position);

COMMENT ON TABLE public.workshop_checklist_items IS
  'Item definitions owned by a checklist version. Mutable only while the version is a Draft.';

ALTER TABLE public.workshop_checklist_events
  ADD COLUMN IF NOT EXISTS item_id uuid;

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
      'items_reordered'
    )
  );

CREATE OR REPLACE FUNCTION public.prepare_draft_checklist_item_mutation(
  p_version_id uuid,
  p_expected_revision integer
)
RETURNS TABLE (
  version_id uuid,
  template_id uuid,
  version_number integer,
  status text,
  revision integer,
  phase text,
  bike_category text,
  actor_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid;
  v_role public.user_role;
  v_phase text;
  v_bike_category text;
  v_template_id uuid;
  v_version_number integer;
  v_status text;
  v_revision integer;
BEGIN
  v_actor_id := (SELECT auth.uid());
  v_role := public.get_user_role();

  IF v_actor_id IS NULL
     OR v_role IS NULL
     OR v_role <> ALL (
       ARRAY['admin'::public.user_role, 'manager'::public.user_role]
     )
  THEN
    RAISE EXCEPTION 'Not authorized to configure checklist items'
      USING ERRCODE = '42501';
  END IF;

  IF p_version_id IS NULL THEN
    RAISE EXCEPTION 'Checklist version not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF p_expected_revision IS NULL OR p_expected_revision <= 0 THEN
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
  WHERE version.id = p_version_id;

  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'Checklist version not found'
      USING ERRCODE = 'P0002';
  END IF;

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
  WHERE version.id = p_version_id
  FOR UPDATE;

  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'Checklist version not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'Checklist version is not a draft'
      USING ERRCODE = '55000',
            DETAIL = pg_catalog.json_build_object(
              'revision', v_revision,
              'status', v_status
            )::text;
  END IF;

  IF v_revision IS DISTINCT FROM p_expected_revision THEN
    RAISE EXCEPTION 'Checklist version is stale'
      USING ERRCODE = 'P0001',
            DETAIL = pg_catalog.json_build_object(
              'stale', true,
              'revision', v_revision,
              'status', v_status
            )::text;
  END IF;

  version_id := p_version_id;
  template_id := v_template_id;
  version_number := v_version_number;
  status := v_status;
  revision := v_revision;
  phase := v_phase;
  bike_category := v_bike_category;
  actor_id := v_actor_id;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.commit_draft_checklist_item_event(
  p_version_id uuid,
  p_template_id uuid,
  p_version_number integer,
  p_phase text,
  p_bike_category text,
  p_actor_id uuid,
  p_event_type text,
  p_item_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_revision integer;
BEGIN
  UPDATE public.workshop_checklist_versions
  SET revision = revision + 1
  WHERE id = p_version_id
  RETURNING revision INTO v_revision;

  INSERT INTO public.workshop_checklist_events (
    event_type,
    actor_id,
    phase,
    bike_category,
    template_id,
    version_id,
    version_number,
    revision,
    item_id
  )
  VALUES (
    p_event_type,
    p_actor_id,
    p_phase,
    p_bike_category,
    p_template_id,
    p_version_id,
    p_version_number,
    v_revision,
    p_item_id
  );

  RETURN v_revision;
END;
$$;

DROP FUNCTION IF EXISTS public.assert_draft_checklist_item_fields(text, boolean, boolean, text);

CREATE OR REPLACE FUNCTION public.assert_draft_checklist_item_fields(
  p_label text,
  p_item_type text,
  p_m1 boolean,
  p_m2 boolean,
  p_setup_category text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_label IS NULL OR btrim(p_label) = '' THEN
    RAISE EXCEPTION 'Label is required'
      USING ERRCODE = '22023';
  END IF;

  IF p_item_type IS NULL OR p_item_type NOT IN ('action', 'value') THEN
    RAISE EXCEPTION 'Unsupported item type'
      USING ERRCODE = '22023';
  END IF;

  IF p_m1 IS NULL OR p_m2 IS NULL THEN
    RAISE EXCEPTION 'M2 requires M1'
      USING ERRCODE = '22023';
  END IF;

  IF p_m2 AND NOT p_m1 THEN
    RAISE EXCEPTION 'M2 requires M1'
      USING ERRCODE = '22023';
  END IF;

  IF p_setup_category IS NOT NULL
     AND p_setup_category NOT IN (
       'pedals',
       'saddle',
       'wheelset',
       'power-meter',
       'computer-mount'
     )
  THEN
    RAISE EXCEPTION 'Unsupported setup category'
      USING ERRCODE = '22023';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_draft_checklist_item(
  version_id uuid,
  expected_revision integer,
  label text,
  item_type text,
  required boolean,
  m1 boolean,
  m2 boolean,
  setup_category text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ctx record;
  v_item_id uuid;
  v_position integer;
BEGIN
  SELECT *
  INTO STRICT v_ctx
  FROM public.prepare_draft_checklist_item_mutation(
    version_id,
    expected_revision
  );

  PERFORM public.assert_draft_checklist_item_fields(
    label,
    item_type,
    m1,
    m2,
    setup_category
  );

  SELECT COALESCE(MAX(item.position), 0) + 1
  INTO v_position
  FROM public.workshop_checklist_items AS item
  WHERE item.version_id = v_ctx.version_id;

  INSERT INTO public.workshop_checklist_items (
    version_id,
    label,
    position,
    item_type,
    required,
    m1,
    m2,
    setup_category
  )
  VALUES (
    v_ctx.version_id,
    label,
    v_position,
    item_type,
    COALESCE(required, false),
    m1,
    m2,
    setup_category
  )
  RETURNING id INTO v_item_id;

  RETURN public.commit_draft_checklist_item_event(
    v_ctx.version_id,
    v_ctx.template_id,
    v_ctx.version_number,
    v_ctx.phase,
    v_ctx.bike_category,
    v_ctx.actor_id,
    'item_added',
    v_item_id
  );
END;
$$;

DROP FUNCTION IF EXISTS public.update_draft_checklist_item(uuid, integer, text, text, boolean, boolean, boolean, text);

CREATE OR REPLACE FUNCTION public.update_draft_checklist_item(
  version_id uuid,
  item_id uuid,
  expected_revision integer,
  label text,
  item_type text,
  required boolean,
  m1 boolean,
  m2 boolean,
  setup_category text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item_version_id uuid;
  v_ctx record;
  v_role public.user_role;
BEGIN
  v_role := public.get_user_role();
  IF (SELECT auth.uid()) IS NULL
     OR v_role IS NULL
     OR v_role <> ALL (
       ARRAY['admin'::public.user_role, 'manager'::public.user_role]
     )
  THEN
    RAISE EXCEPTION 'Not authorized to configure checklist items'
      USING ERRCODE = '42501';
  END IF;

  SELECT item.version_id
  INTO v_item_version_id
  FROM public.workshop_checklist_items AS item
  WHERE item.id = item_id;

  IF v_item_version_id IS NULL THEN
    RAISE EXCEPTION 'Checklist item not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_item_version_id IS DISTINCT FROM version_id THEN
    RAISE EXCEPTION 'Checklist item does not belong to checklist version'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO STRICT v_ctx
  FROM public.prepare_draft_checklist_item_mutation(
    version_id,
    expected_revision
  );

  PERFORM public.assert_draft_checklist_item_fields(
    label,
    item_type,
    m1,
    m2,
    setup_category
  );

  UPDATE public.workshop_checklist_items AS item
  SET
    label = update_draft_checklist_item.label,
    item_type = update_draft_checklist_item.item_type,
    required = COALESCE(update_draft_checklist_item.required, false),
    m1 = update_draft_checklist_item.m1,
    m2 = update_draft_checklist_item.m2,
    setup_category = update_draft_checklist_item.setup_category
  WHERE item.id = item_id
    AND item.version_id = v_ctx.version_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checklist item not found'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN public.commit_draft_checklist_item_event(
    v_ctx.version_id,
    v_ctx.template_id,
    v_ctx.version_number,
    v_ctx.phase,
    v_ctx.bike_category,
    v_ctx.actor_id,
    'item_updated',
    item_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_draft_checklist_item(
  item_id uuid,
  expected_revision integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_version_id uuid;
  v_ctx record;
  v_revision integer;
  v_role public.user_role;
BEGIN
  v_role := public.get_user_role();
  IF (SELECT auth.uid()) IS NULL
     OR v_role IS NULL
     OR v_role <> ALL (
       ARRAY['admin'::public.user_role, 'manager'::public.user_role]
     )
  THEN
    RAISE EXCEPTION 'Not authorized to configure checklist items'
      USING ERRCODE = '42501';
  END IF;

  SELECT item.version_id
  INTO v_version_id
  FROM public.workshop_checklist_items AS item
  WHERE item.id = item_id;

  IF v_version_id IS NULL THEN
    RAISE EXCEPTION 'Checklist item not found'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT *
  INTO STRICT v_ctx
  FROM public.prepare_draft_checklist_item_mutation(
    v_version_id,
    expected_revision
  );

  v_revision := public.commit_draft_checklist_item_event(
    v_ctx.version_id,
    v_ctx.template_id,
    v_ctx.version_number,
    v_ctx.phase,
    v_ctx.bike_category,
    v_ctx.actor_id,
    'item_removed',
    item_id
  );

  DELETE FROM public.workshop_checklist_items AS item
  WHERE item.id = item_id
    AND item.version_id = v_ctx.version_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checklist item not found'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN v_revision;
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_draft_checklist_items(
  version_id uuid,
  expected_revision integer,
  item_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ctx record;
  v_current_count integer;
  v_submitted_count integer;
  v_index integer;
BEGIN
  SELECT *
  INTO STRICT v_ctx
  FROM public.prepare_draft_checklist_item_mutation(
    version_id,
    expected_revision
  );

  SELECT count(*)::integer
  INTO v_current_count
  FROM public.workshop_checklist_items AS item
  WHERE item.version_id = v_ctx.version_id;

  v_submitted_count := COALESCE(pg_catalog.array_length(item_ids, 1), 0);

  IF v_submitted_count IS DISTINCT FROM v_current_count THEN
    RAISE EXCEPTION 'Item order is not a permutation of current items'
      USING ERRCODE = '22023';
  END IF;

  IF (
    SELECT count(DISTINCT submitted.id)::integer
    FROM pg_catalog.unnest(item_ids) AS submitted(id)
  ) IS DISTINCT FROM v_submitted_count THEN
    RAISE EXCEPTION 'Item order is not a permutation of current items'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT submitted.id
    FROM pg_catalog.unnest(item_ids) AS submitted(id)
    EXCEPT
    SELECT item.id
    FROM public.workshop_checklist_items AS item
    WHERE item.version_id = v_ctx.version_id
  ) THEN
    RAISE EXCEPTION 'Item order is not a permutation of current items'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.workshop_checklist_items AS item
  SET position = item.position + 1000000
  WHERE item.version_id = v_ctx.version_id;

  IF v_submitted_count > 0 THEN
    FOR v_index IN 1 .. v_submitted_count LOOP
      UPDATE public.workshop_checklist_items AS item
      SET position = v_index
      WHERE item.id = item_ids[v_index]
        AND item.version_id = v_ctx.version_id;
    END LOOP;
  END IF;

  RETURN public.commit_draft_checklist_item_event(
    v_ctx.version_id,
    v_ctx.template_id,
    v_ctx.version_number,
    v_ctx.phase,
    v_ctx.bike_category,
    v_ctx.actor_id,
    'items_reordered',
    NULL
  );
END;
$$;

COMMENT ON FUNCTION public.add_draft_checklist_item(uuid, integer, text, text, boolean, boolean, boolean, text) IS
  'Admin/Manager-only Draft item insert. Locks (bike_category, phase), matches expected_revision, and records item_added.';
COMMENT ON FUNCTION public.update_draft_checklist_item(uuid, uuid, integer, text, text, boolean, boolean, boolean, text) IS
  'Admin/Manager-only Draft item update. Locks (bike_category, phase), matches expected_revision, and records item_updated.';
COMMENT ON FUNCTION public.remove_draft_checklist_item(uuid, integer) IS
  'Admin/Manager-only Draft item delete. Writes item_removed before deleting so events need no item FK.';
COMMENT ON FUNCTION public.reorder_draft_checklist_items(uuid, integer, uuid[]) IS
  'Admin/Manager-only Draft reorder. Requires a full permutation of current item ids and writes dense positions.';

ALTER TABLE public.workshop_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and managers can read workshop checklist items"
  ON public.workshop_checklist_items;
CREATE POLICY "Admins and managers can read workshop checklist items"
  ON public.workshop_checklist_items
  FOR SELECT
  TO authenticated
  USING (
    (select public.get_user_role()) = ANY (
      ARRAY['admin'::public.user_role, 'manager'::public.user_role]
    )
  );

REVOKE ALL ON TABLE public.workshop_checklist_items FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prepare_draft_checklist_item_mutation(uuid, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.commit_draft_checklist_item_event(uuid, uuid, integer, text, text, uuid, text, uuid)
  FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.assert_draft_checklist_item_fields(text, boolean, boolean, text);
REVOKE ALL ON FUNCTION public.assert_draft_checklist_item_fields(text, text, boolean, boolean, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_draft_checklist_item(uuid, integer, text, text, boolean, boolean, boolean, text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_draft_checklist_item(uuid, uuid, integer, text, text, boolean, boolean, boolean, text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_draft_checklist_item(uuid, integer)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reorder_draft_checklist_items(uuid, integer, uuid[])
  FROM PUBLIC, anon;

GRANT SELECT ON TABLE public.workshop_checklist_items TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_draft_checklist_item(uuid, integer, text, text, boolean, boolean, boolean, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_draft_checklist_item(uuid, uuid, integer, text, text, boolean, boolean, boolean, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_draft_checklist_item(uuid, integer)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_draft_checklist_items(uuid, integer, uuid[])
  TO authenticated;
