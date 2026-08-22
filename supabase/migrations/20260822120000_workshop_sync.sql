-- Workshop sync: run leases, renew/release/record, staff start/resume, health.
-- Idempotent. Apply locally only.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS private.booqable_run_leases (
  lock_key text PRIMARY KEY,
  token uuid NOT NULL,
  fence bigint NOT NULL CHECK (fence >= 1),
  run_id uuid,
  owner text,
  expires_at timestamptz NOT NULL,
  acquired_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE private.booqable_run_leases FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE private.booqable_run_leases TO postgres, service_role;

CREATE TABLE IF NOT EXISTS public.booqable_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope = ANY (ARRAY['next_7_days', 'all_reserved'])),
  state text NOT NULL CHECK (
    state = ANY (ARRAY['in_progress', 'succeeded', 'failed'])
  ),
  cursor text,
  listed integer NOT NULL DEFAULT 0 CHECK (listed >= 0),
  succeeded integer NOT NULL DEFAULT 0 CHECK (succeeded >= 0),
  failed integer NOT NULL DEFAULT 0 CHECK (failed >= 0),
  skipped integer NOT NULL DEFAULT 0 CHECK (skipped >= 0),
  last_error text,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booqable_sync_order_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.booqable_sync_runs(id) ON DELETE CASCADE,
  booqable_order_id text NOT NULL,
  ok boolean NOT NULL,
  code text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booqable_sync_health (
  id text PRIMARY KEY CHECK (id = 'workshop'),
  last_success_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.booqable_sync_health (id)
VALUES ('workshop')
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS booqable_sync_order_results_run_id_idx
  ON public.booqable_sync_order_results (run_id);

ALTER TABLE public.booqable_sync_order_results
  DROP CONSTRAINT IF EXISTS booqable_sync_order_results_run_order_key;

ALTER TABLE public.booqable_sync_order_results
  ADD CONSTRAINT booqable_sync_order_results_run_order_key
  UNIQUE (run_id, booqable_order_id);

CREATE INDEX IF NOT EXISTS booqable_sync_runs_last_attempt_idx
  ON public.booqable_sync_runs (last_attempt_at DESC);

-- ---------------------------------------------------------------------------
-- Skip task-mint flag: wrap the existing creator without editing 20260821160000
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regprocedure(
    'private.booqable_create_instance_task_inner(public.orders,jsonb,text)'
  ) IS NULL
     AND to_regprocedure(
       'private.booqable_create_instance_task(public.orders,jsonb,text)'
     ) IS NOT NULL THEN
    ALTER FUNCTION private.booqable_create_instance_task(public.orders, jsonb, text)
      RENAME TO booqable_create_instance_task_inner;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION private.booqable_create_instance_task(
  p_order public.orders,
  p_assignment jsonb,
  p_fingerprint text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF lower(coalesce(pg_catalog.current_setting('booqable.mint_tasks', true), 'on'))
     = 'off' THEN
    RETURN;
  END IF;
  PERFORM private.booqable_create_instance_task_inner(
    p_order, p_assignment, p_fingerprint
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.booqable_apply_source_snapshot_v1(
  p_booqable_order_id text,
  p_token uuid,
  p_fence bigint,
  p_snapshot jsonb,
  p_mint_tasks boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM pg_catalog.set_config(
    'booqable.mint_tasks',
    CASE WHEN p_mint_tasks THEN 'on' ELSE 'off' END,
    true
  );
  RETURN private.booqable_apply_source_snapshot_v1(
    p_booqable_order_id, p_token, p_fence, p_snapshot
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.booqable_apply_source_snapshot_v1(
  booqable_order_id text,
  token uuid,
  fence bigint,
  snapshot jsonb,
  mint_tasks boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN private.booqable_apply_source_snapshot_v1(
    booqable_order_id, token, fence, snapshot, mint_tasks
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Order lease renew / release
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.booqable_renew_order_lease(
  p_booqable_order_id text,
  p_token uuid,
  p_fence bigint,
  p_expires_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_lease private.booqable_order_leases;
BEGIN
  IF p_expires_at IS NULL OR p_expires_at <= now() THEN
    RETURN private.booqable_err('STALE_LEASE', 'Lease expiry must be in the future.');
  END IF;

  UPDATE private.booqable_order_leases
  SET expires_at = p_expires_at
  WHERE booqable_order_id = p_booqable_order_id
    AND token = p_token
    AND fence = p_fence
    AND expires_at > now()
  RETURNING * INTO v_lease;

  IF v_lease.token IS NULL THEN
    RETURN private.booqable_err('STALE_LEASE', 'Lease token, fence, or expiry is not current.');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'token', v_lease.token,
    'fence', v_lease.fence,
    'expiresAt', v_lease.expires_at,
    'owner', v_lease.owner
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.booqable_release_order_lease(
  p_booqable_order_id text,
  p_token uuid,
  p_fence bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_lease private.booqable_order_leases;
BEGIN
  UPDATE private.booqable_order_leases
  SET expires_at = now()
  WHERE booqable_order_id = p_booqable_order_id
    AND token = p_token
    AND fence = p_fence
  RETURNING * INTO v_lease;

  IF v_lease.token IS NULL THEN
    RETURN private.booqable_err('STALE_LEASE', 'Lease token, fence, or expiry is not current.');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.booqable_renew_order_lease(
  booqable_order_id text,
  token uuid,
  fence bigint,
  expires_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN private.booqable_renew_order_lease(
    booqable_order_id, token, fence, expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.booqable_release_order_lease(
  booqable_order_id text,
  token uuid,
  fence bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN private.booqable_release_order_lease(booqable_order_id, token, fence);
END;
$$;

-- ---------------------------------------------------------------------------
-- Run lease + record
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.booqable_acquire_run_lease(
  p_lock_key text,
  p_expires_at timestamptz,
  p_owner text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_lease private.booqable_run_leases;
BEGIN
  IF p_lock_key IS NULL OR btrim(p_lock_key) = '' THEN
    RETURN private.booqable_err('INVALID_SNAPSHOT', 'run lock key is required.');
  END IF;
  IF p_expires_at IS NULL OR p_expires_at <= now() THEN
    RETURN private.booqable_err('STALE_LEASE', 'Lease expiry must be in the future.');
  END IF;

  INSERT INTO private.booqable_run_leases AS l (
    lock_key, token, fence, owner, expires_at
  ) VALUES (
    p_lock_key,
    pg_catalog.gen_random_uuid(),
    1,
    p_owner,
    p_expires_at
  )
  ON CONFLICT (lock_key) DO UPDATE
  SET token = pg_catalog.gen_random_uuid(),
      fence = l.fence + 1,
      owner = EXCLUDED.owner,
      expires_at = EXCLUDED.expires_at,
      acquired_at = now(),
      run_id = NULL
  WHERE l.expires_at <= now()
  RETURNING * INTO v_lease;

  IF v_lease.token IS NULL THEN
    RETURN private.booqable_err(
      'SYNC_IN_PROGRESS',
      'An unexpired run lease already holds manual sync.'
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'token', v_lease.token,
    'fence', v_lease.fence,
    'expiresAt', v_lease.expires_at,
    'owner', v_lease.owner
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.booqable_renew_run_lease(
  p_lock_key text,
  p_token uuid,
  p_fence bigint,
  p_expires_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_lease private.booqable_run_leases;
BEGIN
  IF p_expires_at IS NULL OR p_expires_at <= now() THEN
    RETURN private.booqable_err('STALE_LEASE', 'Lease expiry must be in the future.');
  END IF;

  UPDATE private.booqable_run_leases
  SET expires_at = p_expires_at
  WHERE lock_key = p_lock_key
    AND token = p_token
    AND fence = p_fence
    AND expires_at > now()
  RETURNING * INTO v_lease;

  IF v_lease.token IS NULL THEN
    RETURN private.booqable_err('STALE_LEASE', 'Lease token, fence, or expiry is not current.');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'token', v_lease.token,
    'fence', v_lease.fence,
    'expiresAt', v_lease.expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.booqable_release_run_lease(
  p_lock_key text,
  p_token uuid,
  p_fence bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_lease private.booqable_run_leases;
BEGIN
  UPDATE private.booqable_run_leases
  SET expires_at = now()
  WHERE lock_key = p_lock_key
    AND token = p_token
    AND fence = p_fence
  RETURNING * INTO v_lease;

  IF v_lease.token IS NULL THEN
    RETURN private.booqable_err('STALE_LEASE', 'Lease token, fence, or expiry is not current.');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

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
  v_inserted boolean;
BEGIN
  SELECT * INTO v_run
  FROM public.booqable_sync_runs
  WHERE id = p_run_id
  FOR UPDATE;

  IF v_run.id IS NULL THEN
    RETURN private.booqable_err('SOURCE_UNAVAILABLE', 'Sync run not found.');
  END IF;

  INSERT INTO public.booqable_sync_order_results (
    run_id, booqable_order_id, ok, code, error
  ) VALUES (
    p_run_id, p_booqable_order_id, p_ok, p_code, p_error
  )
  ON CONFLICT (run_id, booqable_order_id)
  DO UPDATE SET
    ok = EXCLUDED.ok,
    code = EXCLUDED.code,
    error = EXCLUDED.error
  RETURNING (xmax = 0) INTO v_inserted;

  IF v_inserted THEN
    UPDATE public.booqable_sync_runs
    SET listed = listed + 1,
        succeeded = succeeded + CASE WHEN p_ok AND NOT p_skipped THEN 1 ELSE 0 END,
        failed = failed + CASE WHEN NOT p_ok AND NOT p_skipped THEN 1 ELSE 0 END,
        skipped = skipped + CASE WHEN p_skipped THEN 1 ELSE 0 END,
        last_error = CASE WHEN p_ok THEN last_error ELSE coalesce(p_error, last_error) END,
        last_attempt_at = now(),
        updated_at = now()
    WHERE id = p_run_id;
  ELSE
    UPDATE public.booqable_sync_runs
    SET last_error = CASE WHEN p_ok THEN last_error ELSE coalesce(p_error, last_error) END,
        last_attempt_at = now(),
        updated_at = now()
    WHERE id = p_run_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION private.booqable_finish_sync_run(
  p_run_id uuid,
  p_cursor text,
  p_last_error text,
  p_listing_failed boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_run public.booqable_sync_runs;
  v_state text;
BEGIN
  SELECT * INTO v_run
  FROM public.booqable_sync_runs
  WHERE id = p_run_id
  FOR UPDATE;

  IF v_run.id IS NULL THEN
    RETURN private.booqable_err('SOURCE_UNAVAILABLE', 'Sync run not found.');
  END IF;

  IF p_listing_failed THEN
    v_state := 'failed';
  ELSIF v_run.failed > 0 THEN
    v_state := 'failed';
  ELSIF p_cursor IS NULL THEN
    v_state := 'succeeded';
  ELSE
    v_state := 'in_progress';
  END IF;

  UPDATE public.booqable_sync_runs
  SET cursor = p_cursor,
      state = v_state,
      last_error = p_last_error,
      last_attempt_at = now(),
      finished_at = CASE WHEN p_cursor IS NULL THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = p_run_id
  RETURNING * INTO v_run;

  IF v_state = 'succeeded' THEN
    UPDATE public.booqable_sync_health
    SET last_success_at = now(),
        updated_at = now()
    WHERE id = 'workshop';
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'runId', v_run.id,
    'state', v_run.state,
    'cursor', v_run.cursor,
    'counts', jsonb_build_object(
      'listed', v_run.listed,
      'succeeded', v_run.succeeded,
      'failed', v_run.failed,
      'skipped', v_run.skipped
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.booqable_renew_run_lease(
  lock_key text,
  token uuid,
  fence bigint,
  expires_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN private.booqable_renew_run_lease(lock_key, token, fence, expires_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.booqable_release_run_lease(
  lock_key text,
  token uuid,
  fence bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN private.booqable_release_run_lease(lock_key, token, fence);
END;
$$;

CREATE OR REPLACE FUNCTION public.booqable_record_sync_result(
  run_id uuid,
  booqable_order_id text,
  ok boolean,
  code text DEFAULT NULL,
  error text DEFAULT NULL,
  skipped boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN private.booqable_record_sync_result(
    run_id, booqable_order_id, ok, code, error, skipped
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.booqable_finish_sync_run(
  run_id uuid,
  cursor text,
  last_error text,
  listing_failed boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN private.booqable_finish_sync_run(
    run_id, cursor, last_error, listing_failed
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Staff start / resume
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.workshop_staff_or_forbidden()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  v_role := public.get_user_role();
  IF v_role IS NULL OR v_role NOT IN (
    'admin'::public.user_role,
    'manager'::public.user_role,
    'mechanic'::public.user_role
  ) THEN
    RETURN private.workshop_err('FORBIDDEN', 'Staff role required.');
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION private.workshop_start_manual_sync(p_scope text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_denied jsonb;
  v_lease jsonb;
  v_run public.booqable_sync_runs;
BEGIN
  v_denied := private.workshop_staff_or_forbidden();
  IF v_denied IS NOT NULL THEN
    RETURN v_denied;
  END IF;

  IF p_scope IS NULL OR p_scope NOT IN ('next_7_days', 'all_reserved') THEN
    RETURN private.workshop_err('SOURCE_UNAVAILABLE', 'Unknown sync scope.');
  END IF;

  v_lease := private.booqable_acquire_run_lease(
    'manual_sync',
    now() + interval '2 minutes',
    'staff:' || coalesce((SELECT auth.uid())::text, 'unknown')
  );
  IF coalesce(v_lease->>'ok', 'false') <> 'true' THEN
    RETURN v_lease;
  END IF;

  INSERT INTO public.booqable_sync_runs (scope, state)
  VALUES (p_scope, 'in_progress')
  RETURNING * INTO v_run;

  UPDATE private.booqable_run_leases
  SET run_id = v_run.id
  WHERE lock_key = 'manual_sync'
    AND token = (v_lease->>'token')::uuid
    AND fence = (v_lease->>'fence')::bigint;

  RETURN jsonb_build_object(
    'ok', true,
    'runId', v_run.id,
    'state', v_run.state,
    'cursor', v_run.cursor,
    'token', v_lease->>'token',
    'fence', (v_lease->>'fence')::bigint,
    'counts', jsonb_build_object(
      'listed', v_run.listed,
      'succeeded', v_run.succeeded,
      'failed', v_run.failed,
      'skipped', v_run.skipped
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.workshop_resume_manual_sync(
  p_run_id uuid,
  p_scope text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_denied jsonb;
  v_lease jsonb;
  v_run public.booqable_sync_runs;
BEGIN
  v_denied := private.workshop_staff_or_forbidden();
  IF v_denied IS NOT NULL THEN
    RETURN v_denied;
  END IF;

  IF p_scope IS NULL OR p_scope NOT IN ('next_7_days', 'all_reserved') THEN
    RETURN private.workshop_err('SOURCE_UNAVAILABLE', 'Unknown sync scope.');
  END IF;

  SELECT * INTO v_run
  FROM public.booqable_sync_runs
  WHERE id = p_run_id
  FOR UPDATE;

  IF v_run.id IS NULL THEN
    RETURN private.workshop_err('SOURCE_UNAVAILABLE', 'Sync run not found.');
  END IF;

  IF v_run.scope IS DISTINCT FROM p_scope THEN
    RETURN private.workshop_err(
      'SOURCE_UNAVAILABLE',
      'Scope mismatch; restart sync.'
    );
  END IF;

  IF v_run.state = 'succeeded' THEN
    RETURN private.workshop_err('SOURCE_UNAVAILABLE', 'Sync already completed.');
  END IF;

  v_lease := private.booqable_acquire_run_lease(
    'manual_sync',
    now() + interval '2 minutes',
    'staff:' || coalesce((SELECT auth.uid())::text, 'unknown')
  );
  IF coalesce(v_lease->>'ok', 'false') <> 'true' THEN
    RETURN v_lease;
  END IF;

  UPDATE public.booqable_sync_runs
  SET state = 'in_progress',
      last_attempt_at = now(),
      updated_at = now()
  WHERE id = v_run.id
  RETURNING * INTO v_run;

  UPDATE private.booqable_run_leases
  SET run_id = v_run.id
  WHERE lock_key = 'manual_sync'
    AND token = (v_lease->>'token')::uuid
    AND fence = (v_lease->>'fence')::bigint;

  RETURN jsonb_build_object(
    'ok', true,
    'runId', v_run.id,
    'state', v_run.state,
    'cursor', v_run.cursor,
    'token', v_lease->>'token',
    'fence', (v_lease->>'fence')::bigint,
    'counts', jsonb_build_object(
      'listed', v_run.listed,
      'succeeded', v_run.succeeded,
      'failed', v_run.failed,
      'skipped', v_run.skipped
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.workshop_start_manual_sync(scope text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN private.workshop_start_manual_sync(scope);
END;
$$;

CREATE OR REPLACE FUNCTION public.workshop_resume_manual_sync(
  run_id uuid,
  scope text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN private.workshop_resume_manual_sync(run_id, scope);
END;
$$;

CREATE OR REPLACE VIEW public.workshop_sync_health
WITH (security_invoker = true) AS
SELECT
  h.last_success_at,
  r.id AS run_id,
  r.scope,
  r.state,
  r.cursor,
  r.listed,
  r.succeeded,
  r.failed,
  r.skipped,
  r.last_error,
  r.last_attempt_at
FROM public.booqable_sync_health h
LEFT JOIN LATERAL (
  SELECT *
  FROM public.booqable_sync_runs
  ORDER BY last_attempt_at DESC, created_at DESC
  LIMIT 1
) r ON true
WHERE h.id = 'workshop';

-- ---------------------------------------------------------------------------
-- RLS / grants / realtime
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'booqable_sync_runs',
    'booqable_sync_order_results',
    'booqable_sync_health'
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

REVOKE ALL ON TABLE public.workshop_sync_health FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.workshop_sync_health TO authenticated;
GRANT ALL ON TABLE public.workshop_sync_health TO service_role;

DROP POLICY IF EXISTS "Staff can read sync runs" ON public.booqable_sync_runs;
CREATE POLICY "Staff can read sync runs"
  ON public.booqable_sync_runs FOR SELECT TO authenticated
  USING (
    public.get_user_role() = ANY (
      ARRAY['admin'::public.user_role, 'manager'::public.user_role, 'mechanic'::public.user_role]
    )
  );

DROP POLICY IF EXISTS "Staff can read sync order results" ON public.booqable_sync_order_results;
CREATE POLICY "Staff can read sync order results"
  ON public.booqable_sync_order_results FOR SELECT TO authenticated
  USING (
    public.get_user_role() = ANY (
      ARRAY['admin'::public.user_role, 'manager'::public.user_role, 'mechanic'::public.user_role]
    )
  );

DROP POLICY IF EXISTS "Staff can read sync health" ON public.booqable_sync_health;
CREATE POLICY "Staff can read sync health"
  ON public.booqable_sync_health FOR SELECT TO authenticated
  USING (
    public.get_user_role() = ANY (
      ARRAY['admin'::public.user_role, 'manager'::public.user_role, 'mechanic'::public.user_role]
    )
  );

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE (n.nspname = 'private' AND p.proname LIKE 'booqable%')
       OR (n.nspname = 'public' AND p.proname LIKE 'booqable%')
       OR (n.nspname = 'private' AND p.proname IN (
         'workshop_start_manual_sync',
         'workshop_resume_manual_sync',
         'workshop_staff_or_forbidden'
       ))
       OR (n.nspname = 'public' AND p.proname IN (
         'workshop_start_manual_sync',
         'workshop_resume_manual_sync'
       ))
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC', r.schema, r.proname, r.args);
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM anon', r.schema, r.proname, r.args);
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM authenticated', r.schema, r.proname, r.args);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION private.booqable_create_instance_task_inner(public.orders, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION private.booqable_create_instance_task(public.orders, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION private.booqable_apply_source_snapshot_v1(text, uuid, bigint, jsonb, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.booqable_apply_source_snapshot_v1(text, uuid, bigint, jsonb, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION private.booqable_renew_order_lease(text, uuid, bigint, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION private.booqable_release_order_lease(text, uuid, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.booqable_renew_order_lease(text, uuid, bigint, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.booqable_release_order_lease(text, uuid, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION private.booqable_acquire_run_lease(text, timestamptz, text) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION private.booqable_renew_run_lease(text, uuid, bigint, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION private.booqable_release_run_lease(text, uuid, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.booqable_renew_run_lease(text, uuid, bigint, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.booqable_release_run_lease(text, uuid, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION private.booqable_record_sync_result(uuid, text, boolean, text, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.booqable_record_sync_result(uuid, text, boolean, text, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION private.booqable_finish_sync_run(uuid, text, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.booqable_finish_sync_run(uuid, text, text, boolean) TO service_role;

GRANT EXECUTE ON FUNCTION private.workshop_staff_or_forbidden() TO authenticated;
GRANT EXECUTE ON FUNCTION private.workshop_start_manual_sync(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.workshop_resume_manual_sync(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workshop_start_manual_sync(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workshop_resume_manual_sync(uuid, text) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'booqable_sync_runs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.booqable_sync_runs;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'booqable_sync_health'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.booqable_sync_health;
  END IF;
END $$;
