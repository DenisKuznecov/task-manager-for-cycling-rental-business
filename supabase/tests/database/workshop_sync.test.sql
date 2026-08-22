BEGIN;

SELECT no_plan();

CREATE OR REPLACE FUNCTION pg_temp.become(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', p_user_id::text,
      'role', 'authenticated',
      'aud', 'authenticated'
    )::text,
    true
  );
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.create_staff(
  p_id uuid,
  p_email text,
  p_first text,
  p_last text,
  p_role public.user_role
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, is_sso_user, is_anonymous
  ) VALUES (
    p_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    p_email,
    'x',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('first_name', p_first, 'last_name', p_last, 'role', p_role::text),
    now(),
    now(),
    false,
    false
  );
  UPDATE public.profiles
  SET first_name = p_first,
      last_name = p_last,
      role = p_role
  WHERE id = p_id;
  RETURN p_id;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.line(
  p_id text,
  p_title text,
  p_qty integer
)
RETURNS jsonb
LANGUAGE sql
AS $$
  SELECT jsonb_build_object(
    'booqableLineId', p_id,
    'booqableItemId', 'item-' || p_id,
    'parentBooqableLineId', NULL,
    'title', p_title,
    'quantity', p_qty,
    'lineType', 'charge',
    'chargeLabel', NULL,
    'extraInformation', NULL,
    'priceEachInCents', 0,
    'priceInCents', 0,
    'position', 1,
    'relevant', true,
    'createdAt', '2026-08-01T09:00:00Z',
    'updatedAt', '2026-08-01T09:00:00Z'
  );
$$;

CREATE OR REPLACE FUNCTION pg_temp.assignment(p_stock text, p_sip text)
RETURNS jsonb
LANGUAGE sql
AS $$
  SELECT jsonb_build_object(
    'stockItemId', p_stock,
    'sipId', p_sip,
    'displayId', 'RF-1',
    'title', 'Road Bike',
    'workshopTags', '["workshop-road-bike"]'::jsonb
  );
$$;

CREATE OR REPLACE FUNCTION pg_temp.snap(
  p_order_id text,
  p_status text,
  p_stock text DEFAULT 'stock-sync',
  p_sip text DEFAULT 'sip-sync'
)
RETURNS jsonb
LANGUAGE sql
AS $$
  SELECT jsonb_build_object(
    'schemaVersion', 1,
    'fetchedAt', '2026-08-22T10:00:00.000Z',
    'sourceStatus', p_status,
    'order', jsonb_build_object(
      'booqableOrderId', p_order_id,
      'orderNumber', 410,
      'status', p_status,
      'startsAt', '2026-12-10T10:00:00Z',
      'stopsAt', '2026-12-12T17:00:00Z',
      'createdAt', '2026-08-01T09:00:00Z',
      'updatedAt', '2026-08-22T09:00:00Z',
      'fulfillmentType', 'pickup',
      'deliveryAddress', NULL,
      'billingAddress', NULL,
      'mapsLinkOrder', NULL,
      'amountInCents', 1000,
      'discountType', NULL,
      'discountPercentage', NULL,
      'couponDiscountInCents', NULL,
      'couponCodeValue', NULL,
      'partnerPromo', NULL,
      'paymentStatus', 'paid',
      'depositInCents', 0,
      'taxInCents', 0,
      'grandTotalWithTaxInCents', 1000,
      'toBePaidInCents', 0,
      'itemCount', 1
    ),
    'customer', jsonb_build_object(
      'booqableCustomerId', 'cust-' || p_order_id,
      'name', 'Sync Rider',
      'email', 'sync@example.test',
      'phone', NULL,
      'birthday', NULL,
      'createdAt', '2026-01-01T00:00:00Z',
      'updatedAt', '2026-08-01T00:00:00Z'
    ),
    'coupon', NULL,
    'lines', jsonb_build_array(pg_temp.line(p_order_id || '-bike', 'Road Bike', 1)),
    'assignments', jsonb_build_array(pg_temp.assignment(p_stock, p_sip))
  );
$$;

SELECT pg_temp.create_staff(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'mech-sync@example.test',
  'Mo',
  'Mechanic',
  'mechanic'
);
SELECT pg_temp.create_staff(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'partner-sync@example.test',
  'Pat',
  'Partner',
  'partner'
);

-- Order lease renew / release / overlap
SELECT is(
  public.booqable_acquire_order_lease(
    'sync-lease-1', now() + interval '2 minutes', 'test'
  )->>'ok',
  'true',
  'acquire order lease succeeds'
);

CREATE TEMP TABLE sync_lease AS
SELECT
  (public.booqable_acquire_order_lease(
    'sync-lease-renew', now() + interval '2 minutes', 'test'
  )) AS payload;

SELECT is(
  public.booqable_renew_order_lease(
    'sync-lease-renew',
    ((SELECT payload FROM sync_lease)->>'token')::uuid,
    ((SELECT payload FROM sync_lease)->>'fence')::bigint,
    now() + interval '2 minutes'
  )->>'ok',
  'true',
  'renew with same token/fence succeeds'
);

SELECT is(
  public.booqable_renew_order_lease(
    'sync-lease-renew',
    ((SELECT payload FROM sync_lease)->>'token')::uuid,
    ((SELECT payload FROM sync_lease)->>'fence')::bigint + 1,
    now() + interval '2 minutes'
  )->>'code',
  'STALE_LEASE',
  'renew with wrong fence returns STALE_LEASE'
);

SELECT is(
  public.booqable_acquire_order_lease(
    'sync-lease-renew', now() + interval '2 minutes', 'other'
  )->>'code',
  'SYNC_IN_PROGRESS',
  'second acquire on unexpired lease returns SYNC_IN_PROGRESS'
);

SELECT is(
  public.booqable_release_order_lease(
    'sync-lease-renew',
    ((SELECT payload FROM sync_lease)->>'token')::uuid,
    ((SELECT payload FROM sync_lease)->>'fence')::bigint
  )->>'ok',
  'true',
  'release with same token/fence succeeds'
);

SELECT is(
  public.booqable_acquire_order_lease(
    'sync-lease-renew', now() + interval '2 minutes', 'after-release'
  )->>'ok',
  'true',
  'acquire succeeds after release'
);

-- Staff start vs partner
SELECT pg_temp.become('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
SET ROLE authenticated;

SELECT is(
  public.workshop_start_manual_sync('next_7_days')->>'ok',
  'true',
  'mechanic can start manual sync'
);

RESET ROLE;

CREATE TEMP TABLE started_run AS
SELECT id, scope, state
FROM public.booqable_sync_runs
ORDER BY created_at DESC
LIMIT 1;
GRANT SELECT ON started_run TO authenticated;

SELECT is(
  (SELECT scope FROM started_run),
  'next_7_days',
  'start records next_7_days scope'
);

SELECT pg_temp.become('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
SET ROLE authenticated;

SELECT is(
  public.workshop_start_manual_sync('all_reserved')->>'code',
  'SYNC_IN_PROGRESS',
  'overlapping start returns SYNC_IN_PROGRESS'
);

RESET ROLE;

-- Release the run lease held by start so later tests can acquire.
SELECT ok(
  (
    SELECT private.booqable_release_run_lease(
      'manual_sync',
      l.token,
      l.fence
    )->>'ok' = 'true'
    FROM private.booqable_run_leases l
    WHERE l.lock_key = 'manual_sync'
  ),
  'test can release the staff run lease'
);

SELECT pg_temp.become('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
SET ROLE authenticated;

SELECT is(
  public.workshop_start_manual_sync('next_7_days')->>'code',
  'FORBIDDEN',
  'partner start returns FORBIDDEN'
);

SELECT is(
  public.workshop_resume_manual_sync(
    (SELECT id FROM started_run),
    'next_7_days'
  )->>'code',
  'FORBIDDEN',
  'partner resume returns FORBIDDEN'
);

RESET ROLE;

-- Resume scope mismatch after a failed/resumable run
UPDATE public.booqable_sync_runs
SET state = 'failed',
    cursor = 'opaque-cursor'
WHERE id = (SELECT id FROM started_run);

SELECT pg_temp.become('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
SET ROLE authenticated;

SELECT is(
  public.workshop_resume_manual_sync(
    (SELECT id FROM started_run),
    'all_reserved'
  )->>'code',
  'SOURCE_UNAVAILABLE',
  'resume with a different scope requires restart'
);

SELECT is(
  public.workshop_resume_manual_sync(
    (SELECT id FROM started_run),
    'next_7_days'
  )->>'ok',
  'true',
  'mechanic can resume the same scope'
);

RESET ROLE;

SELECT ok(
  (
    SELECT private.booqable_release_run_lease(
      'manual_sync',
      l.token,
      l.fence
    )->>'ok' = 'true'
    FROM private.booqable_run_leases l
    WHERE l.lock_key = 'manual_sync'
  ),
  'release resume lease'
);

-- Grants: staff vs backend-only
SELECT is(
  has_function_privilege(
    'authenticated',
    'public.workshop_start_manual_sync(text)',
    'EXECUTE'
  ),
  true,
  'authenticated has EXECUTE on start'
);

SELECT is(
  has_function_privilege(
    'authenticated',
    'public.workshop_resume_manual_sync(uuid,text)',
    'EXECUTE'
  ),
  true,
  'authenticated has EXECUTE on resume'
);

SELECT is(
  has_function_privilege(
    'authenticated',
    'public.booqable_renew_order_lease(text,uuid,bigint,timestamp with time zone)',
    'EXECUTE'
  ),
  false,
  'authenticated has no EXECUTE on order renew'
);

SELECT is(
  has_function_privilege(
    'authenticated',
    'public.booqable_release_order_lease(text,uuid,bigint)',
    'EXECUTE'
  ),
  false,
  'authenticated has no EXECUTE on order release'
);

SELECT is(
  has_function_privilege(
    'authenticated',
    'public.booqable_record_sync_result(uuid,text,boolean,text,text,boolean)',
    'EXECUTE'
  ),
  false,
  'authenticated has no EXECUTE on record'
);

SELECT is(
  has_function_privilege(
    'authenticated',
    'public.booqable_apply_source_snapshot_v1(text,uuid,bigint,jsonb,boolean)',
    'EXECUTE'
  ),
  false,
  'authenticated has no EXECUTE on mint_tasks apply'
);

-- Full success advances last_success_at; partial does not
CREATE TEMP TABLE health_before AS
SELECT last_success_at FROM public.booqable_sync_health WHERE id = 'workshop';

INSERT INTO public.booqable_sync_runs (id, scope, state)
VALUES (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'all_reserved',
  'in_progress'
);

SELECT is(
  public.booqable_record_sync_result(
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'order-ok',
    true,
    NULL,
    NULL,
    false
  )->>'ok',
  'true',
  'record success for an order'
);

SELECT is(
  public.booqable_finish_sync_run(
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    NULL,
    NULL,
    false
  )->>'state',
  'succeeded',
  'full-success finish marks succeeded'
);

SELECT isnt(
  (SELECT last_success_at FROM public.booqable_sync_health WHERE id = 'workshop'),
  (SELECT last_success_at FROM health_before),
  'full success advances last_success_at'
);

INSERT INTO public.booqable_sync_runs (id, scope, state)
VALUES (
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'next_7_days',
  'in_progress'
);

CREATE TEMP TABLE health_after_full AS
SELECT last_success_at FROM public.booqable_sync_health WHERE id = 'workshop';

SELECT is(
  public.booqable_record_sync_result(
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'order-fail',
    false,
    'SOURCE_UNAVAILABLE',
    'fetch failed',
    false
  )->>'ok',
  'true',
  'record failure for an order'
);

SELECT is(
  public.booqable_finish_sync_run(
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'cursor-page-2',
    'fetch failed',
    false
  )->>'state',
  'failed',
  'partial finish stays failed/resumable'
);

SELECT is(
  (SELECT cursor FROM public.booqable_sync_runs WHERE id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
  'cursor-page-2',
  'partial run keeps a resume cursor'
);

SELECT is(
  (SELECT last_success_at FROM public.booqable_sync_health WHERE id = 'workshop'),
  (SELECT last_success_at FROM health_after_full),
  'partial run does not advance last_success_at'
);

-- Sandbox skip-task-mint: commercial rows, no new bike_tasks
CREATE TEMP TABLE mint_lease AS
SELECT public.booqable_acquire_order_lease(
  'sync-stopped', now() + interval '2 minutes', 'sandbox'
) AS payload;

SELECT is(
  public.booqable_apply_source_snapshot_v1(
    'sync-stopped',
    ((SELECT payload FROM mint_lease)->>'token')::uuid,
    ((SELECT payload FROM mint_lease)->>'fence')::bigint,
    pg_temp.snap('sync-stopped', 'stopped'),
    false
  )->>'ok',
  'true',
  'stopped apply with mint_tasks false succeeds'
);

SELECT is(
  (SELECT status::text FROM public.orders WHERE booqable_order_id = 'sync-stopped'),
  'stopped',
  'stopped sandbox updates the commercial order row'
);

SELECT is(
  (SELECT count(*)::integer FROM public.customers WHERE booqable_customer_id = 'cust-sync-stopped'),
  1,
  'stopped sandbox upserts the customer'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.bike_tasks t
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'sync-stopped'
  ),
  0,
  'stopped sandbox does not mint bike_tasks'
);

-- listing_failed with a resume cursor stays failed even with no order rows
INSERT INTO public.booqable_sync_runs (id, scope, state)
VALUES (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'next_7_days',
  'in_progress'
);

SELECT is(
  public.booqable_finish_sync_run(
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'cursor-same-page',
    'list failed',
    true
  )->>'state',
  'failed',
  'listing_failed finish is failed with a non-null cursor'
);

SELECT is(
  (SELECT cursor FROM public.booqable_sync_runs WHERE id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'),
  'cursor-same-page',
  'listing_failed finish keeps the current-page cursor'
);

-- Same-order retry updates the row and does not double counts
INSERT INTO public.booqable_sync_runs (id, scope, state)
VALUES (
  'ffffffff-ffff-4fff-8fff-ffffffffffff',
  'all_reserved',
  'in_progress'
);

SELECT is(
  public.booqable_record_sync_result(
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    'order-retry',
    true,
    NULL,
    NULL,
    false
  )->>'ok',
  'true',
  'first record of an order succeeds'
);

SELECT is(
  public.booqable_record_sync_result(
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    'order-retry',
    false,
    'SOURCE_UNAVAILABLE',
    'retry failure',
    false
  )->>'ok',
  'true',
  'same-order record is an upsert'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.booqable_sync_order_results
    WHERE run_id = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
      AND booqable_order_id = 'order-retry'
  ),
  1,
  'unique (run_id, booqable_order_id) keeps one result row'
);

SELECT is(
  (
    SELECT listed
    FROM public.booqable_sync_runs
    WHERE id = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
  ),
  1,
  'same-page retry does not increment listed twice'
);

SELECT is(
  (
    SELECT ok
    FROM public.booqable_sync_order_results
    WHERE run_id = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
      AND booqable_order_id = 'order-retry'
  ),
  false,
  'conflict updates ok/code/error'
);

-- Reserved apply through the mint_tasks wrapper mints a task
CREATE TEMP TABLE reserved_mint_lease AS
SELECT public.booqable_acquire_order_lease(
  'sync-reserved-mint', now() + interval '2 minutes', 'test'
) AS payload;

SELECT is(
  public.booqable_apply_source_snapshot_v1(
    'sync-reserved-mint',
    ((SELECT payload FROM reserved_mint_lease)->>'token')::uuid,
    ((SELECT payload FROM reserved_mint_lease)->>'fence')::bigint,
    pg_temp.snap('sync-reserved-mint', 'reserved', 'stock-sync-mint', 'sip-sync-mint'),
    true
  )->>'ok',
  'true',
  'reserved apply with mint_tasks true succeeds'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.bike_tasks t
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'sync-reserved-mint'
  ),
  1,
  'reserved mint_tasks true wrapper mints a bike_tasks row'
);

SELECT finish();

ROLLBACK;
