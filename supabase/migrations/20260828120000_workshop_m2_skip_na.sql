-- M2 re-check skips preparation items M1 marked not_applicable.
-- In-flight needs_recheck tasks can complete without backfilling m2_confirmed.
-- Idempotent. Apply locally only.

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
        OR (
          i.m1_outcome IS DISTINCT FROM 'not_applicable'::public.checklist_item_outcome
          AND i.m2_confirmed IS NOT TRUE
        )
      )
  );
$$;
