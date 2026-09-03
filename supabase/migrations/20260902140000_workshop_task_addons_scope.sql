-- Stock→line only: bundle = package minus wrappers; flat = seed + extraInformation.
-- Idempotent. Apply locally only.

ALTER TABLE public.booqable_assignment_instances
  ADD COLUMN IF NOT EXISTS booqable_line_id text;

CREATE OR REPLACE FUNCTION private.booqable_create_instance_task_inner(
  p_order public.orders,
  p_assignment jsonb,
  p_fingerprint text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_instance_id uuid;
  v_task public.bike_tasks;
  v_tag private.booqable_tag_resolution;
BEGIN
  v_tag := private.booqable_resolve_workshop_tag(p_assignment->'workshopTags');

  INSERT INTO public.booqable_assignment_instances (
    order_id,
    booqable_stock_item_id,
    booqable_stock_item_planning_id,
    bike_display_id,
    bike_title,
    booqable_line_id
  ) VALUES (
    p_order.id,
    p_assignment->>'stockItemId',
    p_assignment->>'sipId',
    p_assignment->>'displayId',
    p_assignment->>'title',
    NULLIF(btrim(p_assignment->>'booqableLineId'), '')
  )
  RETURNING id INTO v_instance_id;

  INSERT INTO public.bike_tasks (
    assignment_instance_id,
    task_kind,
    status,
    version,
    order_id,
    order_number,
    starts_at,
    booqable_stock_item_id,
    bike_display_id,
    bike_title,
    workshop_tag,
    has_configuration_warning,
    selected_definition_id
  ) VALUES (
    v_instance_id,
    'rental_turnaround',
    'to_prepare',
    1,
    p_order.id,
    p_order.order_number,
    p_order.starts_at,
    p_assignment->>'stockItemId',
    p_assignment->>'displayId',
    p_assignment->>'title',
    v_tag.workshop_tag,
    v_tag.has_warning,
    v_tag.definition_id
  )
  RETURNING * INTO v_task;

  IF v_tag.definition_id IS NOT NULL AND NOT v_tag.has_warning THEN
    PERFORM private.workshop_copy_definition_items(
      v_task.id,
      v_tag.definition_id,
      'preparation'::public.bike_task_item_stage
    );
  END IF;

  PERFORM private.workshop_record_event(
    v_task.id,
    'created',
    NULL,
    v_task.status,
    v_task.version,
    NULL,
    NULL,
    NULL,
    p_fingerprint,
    'source_apply'
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.booqable_sync_retained_task(
  p_order public.orders,
  p_instance public.booqable_assignment_instances,
  p_assignment jsonb,
  p_fingerprint text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_task public.bike_tasks;
  v_tag private.booqable_tag_resolution;
  v_has_prep boolean;
  v_from public.bike_task_status;
BEGIN
  v_tag := private.booqable_resolve_workshop_tag(p_assignment->'workshopTags');

  UPDATE public.booqable_assignment_instances
  SET booqable_stock_item_planning_id = p_assignment->>'sipId',
      bike_display_id = p_assignment->>'displayId',
      bike_title = p_assignment->>'title',
      booqable_line_id = COALESCE(
        NULLIF(btrim(p_assignment->>'booqableLineId'), ''),
        public.booqable_assignment_instances.booqable_line_id
      )
  WHERE id = p_instance.id;

  SELECT * INTO v_task
  FROM public.bike_tasks t
  WHERE t.assignment_instance_id = p_instance.id
    AND t.status <> ALL (ARRAY[
      'completed'::public.bike_task_status,
      'cancelled'::public.bike_task_status
    ])
  FOR UPDATE;

  IF v_task.id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.bike_tasks
  SET order_number = p_order.order_number,
      starts_at = p_order.starts_at,
      bike_display_id = p_assignment->>'displayId',
      bike_title = p_assignment->>'title',
      workshop_tag = v_tag.workshop_tag,
      updated_at = now()
  WHERE id = v_task.id;

  IF v_task.status = 'to_prepare'::public.bike_task_status THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.bike_task_items i
      WHERE i.task_id = v_task.id
        AND i.stage = 'preparation'::public.bike_task_item_stage
    ) INTO v_has_prep;

    IF v_tag.definition_id IS NOT NULL AND NOT v_tag.has_warning THEN
      IF v_task.selected_definition_id IS DISTINCT FROM v_tag.definition_id
         OR NOT v_has_prep THEN
        PERFORM private.workshop_replace_preparation_items(v_task.id, v_tag.definition_id);
        v_from := v_task.status;
        v_task := private.workshop_bump_task(v_task.id, v_task.status);
        UPDATE public.bike_tasks
        SET selected_definition_id = v_tag.definition_id,
            has_configuration_warning = false
        WHERE id = v_task.id;
        PERFORM private.workshop_record_event(
          v_task.id,
          'checklist_changed',
          v_from,
          v_task.status,
          v_task.version,
          NULL, NULL, NULL,
          p_fingerprint,
          'source_apply'
        );
      ELSE
        UPDATE public.bike_tasks
        SET has_configuration_warning = false,
            selected_definition_id = v_tag.definition_id
        WHERE id = v_task.id;
      END IF;
    ELSE
      IF v_has_prep OR v_task.selected_definition_id IS NOT NULL THEN
        PERFORM private.workshop_replace_preparation_items(v_task.id, NULL);
        v_from := v_task.status;
        v_task := private.workshop_bump_task(v_task.id, v_task.status);
        UPDATE public.bike_tasks
        SET selected_definition_id = NULL,
            has_configuration_warning = true
        WHERE id = v_task.id;
        PERFORM private.workshop_record_event(
          v_task.id,
          'checklist_changed',
          v_from,
          v_task.status,
          v_task.version,
          NULL, NULL, NULL,
          p_fingerprint,
          'source_apply'
        );
      ELSE
        UPDATE public.bike_tasks
        SET has_configuration_warning = true,
            selected_definition_id = NULL
        WHERE id = v_task.id;
      END IF;
    END IF;
  ELSE
    UPDATE public.bike_tasks
    SET has_configuration_warning = CASE
          WHEN v_tag.has_warning THEN true
          WHEN v_tag.definition_id IS DISTINCT FROM v_task.selected_definition_id THEN true
          ELSE has_configuration_warning
        END
    WHERE id = v_task.id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.workshop_task_addon_items(p_task public.bike_tasks)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH RECURSIVE linked AS (
    SELECT NULLIF(btrim(i.booqable_line_id), '') AS line_id
    FROM public.booqable_assignment_instances i
    WHERE i.id = p_task.assignment_instance_id
      AND NULLIF(btrim(i.booqable_line_id), '') IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.order_items oi
        WHERE oi.order_id = p_task.order_id
          AND btrim(oi.booqable_line_id) = NULLIF(btrim(i.booqable_line_id), '')
      )
  ),
  walk_up AS (
    SELECT
      oi.order_id,
      oi.booqable_line_id,
      NULLIF(btrim(oi.parent_booqable_line_id), '') AS parent_id,
      1 AS depth,
      ARRAY[oi.booqable_line_id]::text[] AS seen
    FROM public.order_items oi
    JOIN linked s ON s.line_id = btrim(oi.booqable_line_id)
    WHERE oi.order_id = p_task.order_id

    UNION ALL

    SELECT
      parent.order_id,
      parent.booqable_line_id,
      NULLIF(btrim(parent.parent_booqable_line_id), '') AS parent_id,
      walk_up.depth + 1,
      walk_up.seen || parent.booqable_line_id
    FROM walk_up
    JOIN public.order_items parent
      ON parent.order_id = walk_up.order_id
     AND parent.booqable_line_id = walk_up.parent_id
    WHERE walk_up.parent_id IS NOT NULL
      AND walk_up.depth < 32
      AND NOT parent.booqable_line_id = ANY (walk_up.seen)
  ),
  ancestors AS (
    SELECT DISTINCT w.booqable_line_id
    FROM walk_up w
    WHERE NOT EXISTS (
      SELECT 1
      FROM linked s
      WHERE s.line_id = btrim(w.booqable_line_id)
    )
  ),
  roots AS (
    SELECT DISTINCT w.booqable_line_id
    FROM walk_up w
    WHERE w.parent_id IS NULL
       OR NOT EXISTS (
         SELECT 1
         FROM public.order_items p
         WHERE p.order_id = p_task.order_id
           AND p.booqable_line_id = w.parent_id
       )
  ),
  walk_down AS (
    SELECT
      oi.id,
      oi.booqable_line_id,
      oi.title,
      oi.quantity,
      oi.line_type,
      oi.position,
      oi.extra_information,
      1 AS depth,
      ARRAY[oi.booqable_line_id]::text[] AS seen
    FROM public.order_items oi
    JOIN roots r ON r.booqable_line_id = oi.booqable_line_id
    WHERE oi.order_id = p_task.order_id
      AND EXISTS (SELECT 1 FROM ancestors)

    UNION ALL

    SELECT
      child.id,
      child.booqable_line_id,
      child.title,
      child.quantity,
      child.line_type,
      child.position,
      child.extra_information,
      walk_down.depth + 1,
      walk_down.seen || child.booqable_line_id
    FROM walk_down
    JOIN public.order_items child
      ON child.order_id = p_task.order_id
     AND NULLIF(btrim(child.parent_booqable_line_id), '') = walk_down.booqable_line_id
    WHERE walk_down.depth < 32
      AND NOT child.booqable_line_id = ANY (walk_down.seen)
  ),
  scoped AS (
    SELECT
      wd.id,
      wd.title,
      wd.quantity,
      wd.line_type,
      wd.position,
      wd.extra_information
    FROM walk_down wd
    WHERE NOT EXISTS (
      SELECT 1
      FROM ancestors a
      WHERE a.booqable_line_id = wd.booqable_line_id
    )

    UNION ALL

    SELECT
      oi.id,
      oi.title,
      oi.quantity,
      oi.line_type,
      oi.position,
      oi.extra_information
    FROM public.order_items oi
    JOIN linked s ON s.line_id = btrim(oi.booqable_line_id)
    WHERE oi.order_id = p_task.order_id
      AND NOT EXISTS (SELECT 1 FROM ancestors)
  )
  SELECT COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', scoped.id,
          'title', scoped.title,
          'quantity', scoped.quantity,
          'lineType', scoped.line_type,
          'extraInformation', scoped.extra_information
        )
        ORDER BY scoped.position NULLS LAST, scoped.id
      )
      FROM scoped
    ),
    '[]'::jsonb
  );
$$;

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
      'stops_at', v_order.stops_at,
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
    'addons', private.workshop_task_addon_items(v_task),
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

REVOKE ALL ON FUNCTION private.workshop_task_addon_items(public.bike_tasks) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.workshop_task_addon_items(public.bike_tasks) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION private.workshop_task_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.booqable_create_instance_task_inner(public.orders, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION private.booqable_sync_retained_task(public.orders, public.booqable_assignment_instances, jsonb, text) TO service_role;
