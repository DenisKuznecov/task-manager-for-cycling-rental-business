-- Hide ancestor wrapper rows from workshop task addons.
-- Keeps the bike seed and the rest of the package. Idempotent. Apply locally only.

CREATE OR REPLACE FUNCTION private.workshop_task_addon_items(p_task public.bike_tasks)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH RECURSIVE resolved_line AS (
    SELECT NULLIF(btrim(i.booqable_line_id), '') AS line_id
    FROM public.booqable_assignment_instances i
    WHERE i.id = p_task.assignment_instance_id
  ),
  linked AS (
    SELECT rl.line_id
    FROM resolved_line rl
    WHERE rl.line_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.order_items oi
        WHERE oi.order_id = p_task.order_id
          AND oi.booqable_line_id = rl.line_id
      )
  ),
  seeds AS (
    SELECT line_id AS booqable_line_id
    FROM linked
    UNION
    SELECT oi.booqable_line_id
    FROM public.order_items oi
    WHERE NOT EXISTS (SELECT 1 FROM linked)
      AND NULLIF(btrim(p_task.bike_title), '') IS NOT NULL
      AND oi.order_id = p_task.order_id
      AND oi.title IS NOT DISTINCT FROM p_task.bike_title
  ),
  walk_up AS (
    SELECT
      oi.order_id,
      oi.booqable_line_id,
      NULLIF(btrim(oi.parent_booqable_line_id), '') AS parent_id,
      1 AS depth,
      ARRAY[oi.booqable_line_id]::text[] AS seen
    FROM public.order_items oi
    JOIN seeds s ON s.booqable_line_id = oi.booqable_line_id
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
      1 AS depth,
      ARRAY[oi.booqable_line_id]::text[] AS seen
    FROM public.order_items oi
    JOIN roots r ON r.booqable_line_id = oi.booqable_line_id
    WHERE oi.order_id = p_task.order_id

    UNION ALL

    SELECT
      child.id,
      child.booqable_line_id,
      child.title,
      child.quantity,
      child.line_type,
      child.position,
      walk_down.depth + 1,
      walk_down.seen || child.booqable_line_id
    FROM walk_down
    JOIN public.order_items child
      ON child.order_id = p_task.order_id
     AND NULLIF(btrim(child.parent_booqable_line_id), '') = walk_down.booqable_line_id
    WHERE walk_down.depth < 32
      AND NOT child.booqable_line_id = ANY (walk_down.seen)
  ),
  ancestors AS (
    SELECT DISTINCT w.booqable_line_id
    FROM walk_up w
    WHERE NOT EXISTS (
      SELECT 1
      FROM seeds s
      WHERE s.booqable_line_id = w.booqable_line_id
    )
  )
  SELECT COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', wd.id,
          'title', wd.title,
          'quantity', wd.quantity,
          'lineType', wd.line_type
        )
        ORDER BY wd.position NULLS LAST, wd.id
      )
      FROM walk_down wd
      WHERE NOT EXISTS (
        SELECT 1
        FROM ancestors a
        WHERE a.booqable_line_id = wd.booqable_line_id
      )
    ),
    '[]'::jsonb
  );
$$;

REVOKE ALL ON FUNCTION private.workshop_task_addon_items(public.bike_tasks) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.workshop_task_addon_items(public.bike_tasks) TO postgres, service_role;
