-- Same-page Sync retry must move succeeded/failed/skipped with the latest
-- per-order result. Persist skipped on the result row and rebuild run
-- counters from those rows so finish/last_success_at match the retry.
-- Idempotent. Apply locally only.

ALTER TABLE public.booqable_sync_order_results
  ADD COLUMN IF NOT EXISTS skipped boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION private.booqable_record_sync_result(
  p_run_id uuid,
  p_booqable_order_id text,
  p_ok boolean,
  p_code text DEFAULT NULL,
  p_error text DEFAULT NULL,
  p_skipped boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_run public.booqable_sync_runs;
BEGIN
  SELECT * INTO v_run
  FROM public.booqable_sync_runs
  WHERE id = p_run_id
  FOR UPDATE;

  IF v_run.id IS NULL THEN
    RETURN private.booqable_err('SOURCE_UNAVAILABLE', 'Sync run not found.');
  END IF;

  INSERT INTO public.booqable_sync_order_results (
    run_id, booqable_order_id, ok, code, error, skipped
  ) VALUES (
    p_run_id, p_booqable_order_id, p_ok, p_code, p_error, p_skipped
  )
  ON CONFLICT (run_id, booqable_order_id)
  DO UPDATE SET
    ok = EXCLUDED.ok,
    code = EXCLUDED.code,
    error = EXCLUDED.error,
    skipped = EXCLUDED.skipped;

  UPDATE public.booqable_sync_runs r
  SET listed = s.listed,
      succeeded = s.succeeded,
      failed = s.failed,
      skipped = s.skipped,
      last_error = CASE WHEN p_ok THEN r.last_error ELSE coalesce(p_error, r.last_error) END,
      last_attempt_at = now(),
      updated_at = now()
  FROM (
    SELECT
      count(*)::integer AS listed,
      count(*) FILTER (WHERE res.ok AND NOT res.skipped)::integer AS succeeded,
      count(*) FILTER (WHERE NOT res.ok AND NOT res.skipped)::integer AS failed,
      count(*) FILTER (WHERE res.skipped)::integer AS skipped
    FROM public.booqable_sync_order_results res
    WHERE res.run_id = p_run_id
  ) s
  WHERE r.id = p_run_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;
