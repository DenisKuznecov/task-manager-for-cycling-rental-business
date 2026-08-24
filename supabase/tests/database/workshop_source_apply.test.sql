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
  p_qty integer,
  p_parent text DEFAULT NULL,
  p_position integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE sql
AS $$
  SELECT jsonb_build_object(
    'booqableLineId', p_id,
    'booqableItemId', 'item-' || p_id,
    'parentBooqableLineId', p_parent,
    'title', p_title,
    'quantity', p_qty,
    'lineType', 'charge',
    'chargeLabel', NULL,
    'extraInformation', NULL,
    'priceEachInCents', 0,
    'priceInCents', 0,
    'position', p_position,
    'relevant', true,
    'createdAt', '2026-08-01T09:00:00Z',
    'updatedAt', '2026-08-01T09:00:00Z'
  );
$$;

CREATE OR REPLACE FUNCTION pg_temp.assignment(
  p_stock text,
  p_sip text,
  p_tags jsonb,
  p_display text DEFAULT 'RF-1',
  p_title text DEFAULT 'Road Bike'
)
RETURNS jsonb
LANGUAGE sql
AS $$
  SELECT jsonb_build_object(
    'stockItemId', p_stock,
    'sipId', p_sip,
    'displayId', p_display,
    'title', p_title,
    'workshopTags', p_tags
  );
$$;

CREATE OR REPLACE FUNCTION pg_temp.snap(
  p_order_id text,
  p_status text,
  p_starts_at text,
  p_assignments jsonb,
  p_lines jsonb,
  p_number integer DEFAULT 344
)
RETURNS jsonb
LANGUAGE sql
AS $$
  SELECT jsonb_build_object(
    'schemaVersion', 1,
    'fetchedAt', '2026-08-21T14:00:00.000Z',
    'sourceStatus', p_status,
    'order', jsonb_build_object(
      'booqableOrderId', p_order_id,
      'orderNumber', p_number,
      'status', p_status,
      'startsAt', p_starts_at,
      'stopsAt', '2026-12-12T17:00:00Z',
      'createdAt', '2026-08-01T09:00:00Z',
      'updatedAt', '2026-08-21T13:25:00Z',
      'fulfillmentType', 'pickup',
      'deliveryAddress', NULL,
      'billingAddress', NULL,
      'mapsLinkOrder', 'https://maps.example.test/' || p_order_id,
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
      'itemCount', jsonb_array_length(p_lines)
    ),
    'customer', jsonb_build_object(
      'booqableCustomerId', 'cust-' || p_order_id,
      'name', 'Fixture Rider',
      'email', 'rider@example.test',
      'phone', '+34000000000',
      'birthday', '1990-05-17',
      'createdAt', '2026-01-01T00:00:00Z',
      'updatedAt', '2026-08-01T00:00:00Z'
    ),
    'coupon', NULL,
    'lines', p_lines,
    'assignments', p_assignments
  );
$$;

CREATE TEMP TABLE apply_leases (
  order_id text PRIMARY KEY,
  token uuid NOT NULL,
  fence bigint NOT NULL
);

CREATE OR REPLACE FUNCTION pg_temp.ensure_lease(p_order_id text)
RETURNS apply_leases
LANGUAGE plpgsql
AS $$
DECLARE
  v_row apply_leases;
  v_lease jsonb;
BEGIN
  SELECT * INTO v_row FROM apply_leases WHERE order_id = p_order_id;
  IF v_row.token IS NOT NULL THEN
    RETURN v_row;
  END IF;
  v_lease := public.booqable_acquire_order_lease(
    p_order_id, now() + interval '1 hour', 'pg-test'
  );
  IF COALESCE((v_lease->>'ok')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'lease failed: %', v_lease;
  END IF;
  INSERT INTO apply_leases (order_id, token, fence)
  VALUES (
    p_order_id,
    (v_lease->>'token')::uuid,
    (v_lease->>'fence')::bigint
  )
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.apply_snap(p_order_id text, p_snapshot jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_lease apply_leases;
BEGIN
  v_lease := pg_temp.ensure_lease(p_order_id);
  RETURN public.booqable_apply_source_snapshot_v1(
    p_order_id, v_lease.token, v_lease.fence, p_snapshot
  );
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.road_snap(
  p_order_id text,
  p_stock text DEFAULT 'stock-a',
  p_sip text DEFAULT 'sip-a',
  p_starts text DEFAULT '2026-12-10T10:00:00Z',
  p_extra_qty integer DEFAULT 1,
  p_status text DEFAULT 'reserved'
)
RETURNS jsonb
LANGUAGE sql
AS $$
  SELECT pg_temp.snap(
    p_order_id,
    p_status,
    p_starts,
    jsonb_build_array(
      pg_temp.assignment(p_stock, p_sip, '["workshop-road-bike"]'::jsonb)
    ),
    jsonb_build_array(
      pg_temp.line(p_order_id || '-bike', 'Road Bike', 1, NULL, 1),
      pg_temp.line(p_order_id || '-extra', 'Helmet', p_extra_qty, NULL, 2)
    )
  );
$$;

-- Identified road
SELECT is(
  (pg_temp.apply_snap('bq-road', pg_temp.road_snap('bq-road'))->>'ok')::boolean,
  true,
  'identified road apply succeeds'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.booqable_assignment_instances i
    JOIN public.orders o ON o.id = i.order_id
    WHERE o.booqable_order_id = 'bq-road' AND i.closed_at IS NULL
  ),
  1,
  'identified road opens one instance'
);

SELECT is(
  (
    SELECT t.status::text
    FROM public.bike_tasks t
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-road'
  ),
  'to_prepare',
  'identified road task is to_prepare'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.bike_task_items i
    JOIN public.bike_tasks t ON t.id = i.task_id
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-road'
      AND i.stage = 'preparation'
  ),
  25,
  'identified road copies ROAD items'
);

SELECT isnt(
  (SELECT source_fingerprint FROM public.orders WHERE booqable_order_id = 'bq-road'),
  NULL,
  'identified road sets source_fingerprint'
);

SELECT isnt(
  (SELECT addon_fingerprint FROM public.orders WHERE booqable_order_id = 'bq-road'),
  NULL,
  'identified road sets addon_fingerprint'
);

SELECT is(
  (
    SELECT i.booqable_stock_item_planning_id
    FROM public.booqable_assignment_instances i
    JOIN public.orders o ON o.id = i.order_id
    WHERE o.booqable_order_id = 'bq-road'
  ),
  'sip-a',
  'identified road stores SIP id on the instance'
);

SELECT is(
  (
    SELECT e.source
    FROM public.bike_task_events e
    JOIN public.bike_tasks t ON t.id = e.task_id
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-road'
    LIMIT 1
  ),
  'source_apply',
  'identified road events use source_apply'
);

SELECT is(
  (
    SELECT c.booqable_customer_id
    FROM public.customers c
    JOIN public.orders o ON o.customer_id = c.id
    WHERE o.booqable_order_id = 'bq-road'
  ),
  'cust-bq-road',
  'identified road upserts the snapshot customer'
);

SELECT is(
  (
    SELECT o.customer_id IS NOT NULL
    FROM public.orders o
    WHERE o.booqable_order_id = 'bq-road'
  ),
  true,
  'identified road points orders.customer_id at that customer'
);

SELECT ok(
  (
    pg_temp.apply_snap(
      'bq-road',
      jsonb_set(
        jsonb_set(pg_temp.road_snap('bq-road'), '{customer,name}', '"Renamed Rider"'),
        '{customer,email}',
        '"renamed@example.test"'
      )
    )->>'ok'
  )::boolean,
  'customer name/email update apply succeeds'
);

SELECT is(
  (
    SELECT c.name
    FROM public.customers c
    JOIN public.orders o ON o.customer_id = c.id
    WHERE o.booqable_order_id = 'bq-road'
  ),
  'Renamed Rider',
  'second apply updates customer name'
);

SELECT is(
  (
    SELECT c.email
    FROM public.customers c
    JOIN public.orders o ON o.customer_id = c.id
    WHERE o.booqable_order_id = 'bq-road'
  ),
  'renamed@example.test',
  'second apply updates customer email'
);

SELECT ok(
  (
    pg_temp.apply_snap(
      'bq-road',
      jsonb_set(pg_temp.road_snap('bq-road'), '{customer}', 'null'::jsonb)
    )->>'ok'
  )::boolean,
  'apply without a customer object succeeds'
);

SELECT is(
  (
    SELECT c.booqable_customer_id
    FROM public.customers c
    JOIN public.orders o ON o.customer_id = c.id
    WHERE o.booqable_order_id = 'bq-road'
  ),
  'cust-bq-road',
  'missing customer object does not wipe orders.customer_id'
);

-- Mixed identified + unidentified
SELECT is(
  (
    pg_temp.apply_snap(
      'bq-mixed',
      pg_temp.snap(
        'bq-mixed',
        'reserved',
        '2026-12-10T10:00:00Z',
        jsonb_build_array(
          pg_temp.assignment('stock-mixed', 'sip-mixed', '["workshop-road-bike"]'::jsonb)
        ),
        jsonb_build_array(
          pg_temp.line('mixed-bike', 'Road', 1, NULL, 1),
          pg_temp.line('mixed-unidentified', 'Unidentified', 1, NULL, 2)
        )
      )
    )->>'created'
  )::integer,
  1,
  'mixed order creates a task only for the identified bike'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.bike_tasks t
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-mixed'
  ),
  1,
  'mixed order has exactly one task'
);

-- Replay
CREATE TEMP TABLE road_ids AS
SELECT
  i.id AS instance_id,
  t.id AS task_id,
  t.version,
  o.source_fingerprint,
  o.addon_fingerprint
FROM public.orders o
JOIN public.booqable_assignment_instances i ON i.order_id = o.id
JOIN public.bike_tasks t ON t.assignment_instance_id = i.id
WHERE o.booqable_order_id = 'bq-road';

SELECT is(
  (pg_temp.apply_snap('bq-road', pg_temp.road_snap('bq-road'))->>'ok')::boolean,
  true,
  'replay apply succeeds'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.bike_tasks t
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-road'
  ),
  1,
  'replay does not create another task'
);

SELECT is(
  (
    SELECT t.id
    FROM public.bike_tasks t
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-road'
  ),
  (SELECT task_id FROM road_ids),
  'replay keeps the same task id'
);

SELECT is(
  (
    SELECT t.version
    FROM public.bike_tasks t
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-road'
  ),
  (SELECT version FROM road_ids),
  'replay does not bump version'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.bike_task_events e
    JOIN public.bike_tasks t ON t.id = e.task_id
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-road'
  ),
  1,
  'replay inserts no new event rows'
);

-- Remove {A} then empty
SELECT is(
  (
    pg_temp.apply_snap(
      'bq-road',
      pg_temp.snap(
        'bq-road',
        'reserved',
        '2026-12-10T10:00:00Z',
        '[]'::jsonb,
        jsonb_build_array(pg_temp.line('bq-road-bike', 'Road Bike', 1, NULL, 1))
      )
    )->>'cancelled'
  )::integer,
  1,
  'remove closes the identified assignment'
);

SELECT is(
  (
    SELECT t.status::text
    FROM public.bike_tasks t
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-road'
  ),
  'cancelled',
  'remove cancels the task'
);

SELECT is(
  (
    SELECT i.closed_at IS NOT NULL
    FROM public.booqable_assignment_instances i
    JOIN public.orders o ON o.id = i.order_id
    WHERE o.booqable_order_id = 'bq-road'
      AND i.booqable_stock_item_id = 'stock-a'
  ),
  true,
  'remove closes the instance'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.bike_task_events e
    JOIN public.bike_tasks t ON t.id = e.task_id
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-road'
  ) >= 2,
  true,
  'remove keeps task history'
);

-- Re-add with a new SIP
SELECT is(
  (
    pg_temp.apply_snap(
      'bq-road',
      pg_temp.road_snap('bq-road', 'stock-a', 'sip-a-readd')
    )->>'created'
  )::integer,
  1,
  're-add after close creates a new instance'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.booqable_assignment_instances i
    JOIN public.orders o ON o.id = i.order_id
    WHERE o.booqable_order_id = 'bq-road'
  ),
  2,
  're-add keeps the closed instance'
);

SELECT is(
  (
    SELECT t.status::text
    FROM public.bike_tasks t
    JOIN public.booqable_assignment_instances i ON i.id = t.assignment_instance_id
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-road'
      AND i.closed_at IS NULL
  ),
  'to_prepare',
  're-add mints a fresh to_prepare task'
);

-- Replace {A} then {B}
SELECT ok(
  (pg_temp.apply_snap('bq-replace', pg_temp.road_snap('bq-replace', 'stock-a', 'sip-a'))->>'ok')::boolean,
  'replace setup for A succeeds'
);

SELECT is(
  (
    pg_temp.apply_snap(
      'bq-replace',
      pg_temp.road_snap('bq-replace', 'stock-b', 'sip-b', '2026-12-10T10:00:00Z', 1)
    )->>'created'
  )::integer,
  1,
  'replace creates B'
);

SELECT is(
  (
    SELECT count(*) FILTER (WHERE t.status = 'cancelled')::integer
    FROM public.bike_tasks t
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-replace'
  ),
  1,
  'replace cancels A'
);

SELECT is(
  (
    SELECT t.booqable_stock_item_id
    FROM public.bike_tasks t
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-replace'
      AND t.status = 'to_prepare'
  ),
  'stock-b',
  'replace B is a new task'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.bike_task_items i
    JOIN public.bike_tasks t ON t.id = i.task_id
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-replace'
      AND t.status = 'cancelled'
  ) IS DISTINCT FROM (
    SELECT count(*)::integer
    FROM public.bike_task_items i
    JOIN public.bike_tasks t ON t.id = i.task_id
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-replace'
      AND t.status = 'to_prepare'
  ),
  false,
  'replace does not transfer item rows to B (B has its own copy)'
);

SELECT is(
  (
    SELECT count(DISTINCT t.id)::integer
    FROM public.bike_task_items i
    JOIN public.bike_tasks t ON t.id = i.task_id
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-replace'
  ),
  2,
  'replace keeps A history items and creates B items separately'
);

-- Date-only
SELECT ok(
  (pg_temp.apply_snap('bq-date', pg_temp.road_snap('bq-date'))->>'ok')::boolean,
  'date-only setup succeeds'
);

CREATE TEMP TABLE date_before AS
SELECT t.id AS task_id, t.version, count(i.id)::integer AS items
FROM public.bike_tasks t
JOIN public.orders o ON o.id = t.order_id
LEFT JOIN public.bike_task_items i ON i.task_id = t.id
WHERE o.booqable_order_id = 'bq-date'
GROUP BY t.id, t.version;

SELECT is(
  (
    pg_temp.apply_snap(
      'bq-date',
      pg_temp.road_snap('bq-date', 'stock-a', 'sip-a', '2026-12-09T10:00:00Z')
    )->>'retained'
  )::integer,
  1,
  'date-only retains the assignment'
);

SELECT is(
  (
    SELECT t.starts_at
    FROM public.bike_tasks t
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-date'
  ),
  timestamptz '2026-12-09 10:00:00+00',
  'date-only copies queue starts_at'
);

SELECT is(
  (
    SELECT t.version
    FROM public.bike_tasks t
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-date'
  ),
  (SELECT version FROM date_before),
  'date-only does not bump version'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.bike_task_items i
    JOIN public.bike_tasks t ON t.id = i.task_id
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-date'
  ),
  (SELECT items FROM date_before),
  'date-only keeps checklist work'
);

-- to_prepare checklist replace
SELECT ok(
  (pg_temp.apply_snap('bq-prep-replace', pg_temp.road_snap('bq-prep-replace'))->>'ok')::boolean,
  'to_prepare replace setup succeeds'
);

SELECT is(
  (
    SELECT t.version
    FROM public.bike_tasks t
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-prep-replace'
  ),
  1,
  'to_prepare replace starts at version 1'
);

SELECT ok(
  (
    pg_temp.apply_snap(
      'bq-prep-replace',
      pg_temp.snap(
        'bq-prep-replace',
        'reserved',
        '2026-12-10T10:00:00Z',
        jsonb_build_array(
          pg_temp.assignment('stock-a', 'sip-a', '["workshop-gravel-bike"]'::jsonb)
        ),
        jsonb_build_array(
          pg_temp.line('bq-prep-replace-bike', 'Road Bike', 1, NULL, 1),
          pg_temp.line('bq-prep-replace-extra', 'Helmet', 1, NULL, 2)
        )
      )
    )->>'ok'
  )::boolean,
  'to_prepare gravel re-apply succeeds'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.bike_task_items i
    JOIN public.bike_tasks t ON t.id = i.task_id
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-prep-replace'
      AND i.stage = 'preparation'
  ),
  0,
  'to_prepare tag change removes prep items'
);

SELECT is(
  (
    SELECT t.version
    FROM public.bike_tasks t
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-prep-replace'
  ),
  2,
  'to_prepare tag change bumps version'
);

SELECT is(
  (
    SELECT t.has_configuration_warning
    FROM public.bike_tasks t
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-prep-replace'
  ),
  true,
  'to_prepare tag change sets warning'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.bike_task_events e
    JOIN public.bike_tasks t ON t.id = e.task_id
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-prep-replace'
      AND e.event_kind = 'checklist_changed'
      AND e.source = 'source_apply'
  ),
  1,
  'to_prepare tag change writes checklist_changed from source_apply'
);

SELECT ok(
  (pg_temp.apply_snap('bq-prep-replace', pg_temp.road_snap('bq-prep-replace'))->>'ok')::boolean,
  'to_prepare road restore succeeds'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.bike_task_items i
    JOIN public.bike_tasks t ON t.id = i.task_id
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-prep-replace'
      AND i.stage = 'preparation'
  ),
  25,
  'to_prepare road restore recopies ROAD items'
);

SELECT is(
  (
    SELECT t.has_configuration_warning
    FROM public.bike_tasks t
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-prep-replace'
  ),
  false,
  'to_prepare road restore clears warning'
);

-- started/stopped must not cancel
SELECT ok(
  (pg_temp.apply_snap('bq-live-status', pg_temp.road_snap('bq-live-status'))->>'ok')::boolean,
  'started/stopped setup succeeds'
);

SELECT is(
  (pg_temp.apply_snap(
    'bq-live-status',
    pg_temp.road_snap('bq-live-status', 'stock-a', 'sip-a', '2026-12-10T10:00:00Z', 1, 'started')
  )->>'ok')::boolean,
  true,
  'source started apply succeeds'
);

SELECT is(
  (
    SELECT t.status::text
    FROM public.bike_tasks t
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-live-status'
  ),
  'to_prepare',
  'source started does not cancel the task'
);

SELECT is(
  (
    SELECT i.closed_at IS NULL
    FROM public.booqable_assignment_instances i
    JOIN public.orders o ON o.id = i.order_id
    WHERE o.booqable_order_id = 'bq-live-status'
  ),
  true,
  'source started keeps the instance open'
);

SELECT is(
  (pg_temp.apply_snap(
    'bq-live-status',
    pg_temp.road_snap('bq-live-status', 'stock-a', 'sip-a', '2026-12-10T10:00:00Z', 1, 'stopped')
  )->>'ok')::boolean,
  true,
  'source stopped apply succeeds'
);

SELECT is(
  (
    SELECT t.status::text
    FROM public.bike_tasks t
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-live-status'
  ),
  'to_prepare',
  'source stopped does not cancel the task'
);

SELECT is(
  (
    SELECT i.closed_at IS NULL
    FROM public.booqable_assignment_instances i
    JOIN public.orders o ON o.id = i.order_id
    WHERE o.booqable_order_id = 'bq-live-status'
  ),
  true,
  'source stopped keeps the instance open'
);

-- Source canceled with stock still present
SELECT ok(
  (pg_temp.apply_snap('bq-cancel', pg_temp.road_snap('bq-cancel'))->>'ok')::boolean,
  'canceled setup succeeds'
);

SELECT is(
  (
    pg_temp.apply_snap(
      'bq-cancel',
      pg_temp.road_snap('bq-cancel', 'stock-a', 'sip-a', '2026-12-10T10:00:00Z', 1, 'canceled')
    )->>'cancelled'
  )::integer,
  1,
  'source canceled cancels the nonterminal task'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.bike_tasks t
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-cancel'
      AND t.status = 'to_prepare'
  ),
  0,
  'source canceled does not mint a new task'
);

SELECT is(
  (
    SELECT o.status::text
    FROM public.orders o
    WHERE o.booqable_order_id = 'bq-cancel'
  ),
  'canceled',
  'source canceled upserts order status'
);

-- No tag / unknown tag
SELECT ok(
  (
    pg_temp.apply_snap(
      'bq-notag',
      pg_temp.snap(
        'bq-notag',
        'reserved',
        '2026-12-10T10:00:00Z',
        jsonb_build_array(pg_temp.assignment('stock-nt', 'sip-nt', '[]'::jsonb)),
        jsonb_build_array(pg_temp.line('notag-bike', 'Bike', 1))
      )
    )->>'ok'
  )::boolean,
  'missing tag still creates a task'
);

SELECT is(
  (
    SELECT t.has_configuration_warning
    FROM public.bike_tasks t
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-notag'
  ),
  true,
  'missing tag sets configuration warning'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.bike_task_items i
    JOIN public.bike_tasks t ON t.id = i.task_id
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-notag'
  ),
  0,
  'missing tag copies no prep items'
);

SELECT ok(
  (
    pg_temp.apply_snap(
      'bq-gravel',
      pg_temp.snap(
        'bq-gravel',
        'reserved',
        '2026-12-10T10:00:00Z',
        jsonb_build_array(
          pg_temp.assignment('stock-g', 'sip-g', '["workshop-gravel-bike"]'::jsonb, 'GF/L-1', 'Gravel')
        ),
        jsonb_build_array(pg_temp.line('gravel-bike', 'Gravel', 1))
      )
    )->>'ok'
  )::boolean,
  'unknown gravel tag still creates a task'
);

SELECT is(
  (
    SELECT t.has_configuration_warning AND count(i.id) = 0
    FROM public.bike_tasks t
    JOIN public.orders o ON o.id = t.order_id
    LEFT JOIN public.bike_task_items i ON i.task_id = t.id
    WHERE o.booqable_order_id = 'bq-gravel'
    GROUP BY t.has_configuration_warning
  ),
  true,
  'gravel tag is warning-only with no prep items'
);

SELECT pg_temp.create_staff(
  '11111111-1111-4111-8111-111111111111',
  'mech-apply@example.test',
  'Ada',
  'Mechanic',
  'mechanic'
);

SELECT pg_temp.become('11111111-1111-4111-8111-111111111111');
SET ROLE authenticated;

SELECT is(
  (
    public.workshop_start_preparation(
      (SELECT t.id FROM public.bike_tasks t JOIN public.orders o ON o.id = t.order_id WHERE o.booqable_order_id = 'bq-gravel'),
      1
    )->>'code'
  ),
  'CONFIGURATION_BLOCKED',
  'unknown tag blocks start preparation'
);

RESET ROLE;

-- Tag drift after prep starts
SELECT ok(
  (pg_temp.apply_snap('bq-drift', pg_temp.road_snap('bq-drift'))->>'ok')::boolean,
  'tag drift setup succeeds'
);

SELECT pg_temp.become('11111111-1111-4111-8111-111111111111');
SET ROLE authenticated;

SELECT is(
  (
    public.workshop_start_preparation(
      (SELECT t.id FROM public.bike_tasks t JOIN public.orders o ON o.id = t.order_id WHERE o.booqable_order_id = 'bq-drift'),
      1
    )->>'ok'
  )::boolean,
  true,
  'tag drift can start preparation on road'
);

RESET ROLE;

CREATE TEMP TABLE drift_items AS
SELECT count(*)::integer AS n, min(t.version) AS version
FROM public.bike_task_items i
JOIN public.bike_tasks t ON t.id = i.task_id
JOIN public.orders o ON o.id = t.order_id
WHERE o.booqable_order_id = 'bq-drift';

SELECT ok(
  (
    pg_temp.apply_snap(
      'bq-drift',
      pg_temp.snap(
        'bq-drift',
        'reserved',
        '2026-12-10T10:00:00Z',
        jsonb_build_array(
          pg_temp.assignment('stock-a', 'sip-a', '["workshop-gravel-bike"]'::jsonb)
        ),
        jsonb_build_array(
          pg_temp.line('bq-drift-bike', 'Road Bike', 1, NULL, 1),
          pg_temp.line('bq-drift-extra', 'Helmet', 1, NULL, 2)
        )
      )
    )->>'ok'
  )::boolean,
  'tag drift apply succeeds'
);

SELECT is(
  (
    SELECT t.status::text
    FROM public.bike_tasks t
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-drift'
  ),
  'being_prepared',
  'tag drift does not reopen status'
);

SELECT is(
  (
    SELECT t.has_configuration_warning
    FROM public.bike_tasks t
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-drift'
  ),
  true,
  'tag drift sets warning'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.bike_task_items i
    JOIN public.bike_tasks t ON t.id = i.task_id
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-drift'
  ),
  (SELECT n FROM drift_items),
  'tag drift freezes checklist items'
);

-- After ready_for_pickup extras 1→0
SELECT ok(
  (pg_temp.apply_snap('bq-ready', pg_temp.road_snap('bq-ready', 'stock-a', 'sip-a', '2026-12-10T10:00:00Z', 1))->>'ok')::boolean,
  'ready extras setup succeeds'
);

UPDATE public.bike_tasks t
SET status = 'ready_for_pickup'
FROM public.orders o
WHERE o.id = t.order_id
  AND o.booqable_order_id = 'bq-ready';

CREATE TEMP TABLE ready_fp AS
SELECT addon_fingerprint
FROM public.orders
WHERE booqable_order_id = 'bq-ready';

SELECT ok(
  (
    pg_temp.apply_snap(
      'bq-ready',
      pg_temp.road_snap('bq-ready', 'stock-a', 'sip-a', '2026-12-10T10:00:00Z', 0)
    )->>'ok'
  )::boolean,
  'ready extras quantity 0 apply succeeds'
);

SELECT is(
  (
    SELECT t.status::text
    FROM public.bike_tasks t
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-ready'
  ),
  'ready_for_pickup',
  'after ready extras do not reopen status'
);

SELECT isnt(
  (SELECT addon_fingerprint FROM public.orders WHERE booqable_order_id = 'bq-ready'),
  (SELECT addon_fingerprint FROM ready_fp),
  'after ready extras update addon_fingerprint'
);

SELECT is(
  (
    SELECT oi.quantity
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.booqable_order_id = 'bq-ready'
      AND oi.booqable_line_id = 'bq-ready-extra'
  ),
  0,
  'quantity 0 extras stay as rows'
);

-- Bad envelope: missing assignments
CREATE TEMP TABLE orders_before_bad AS
SELECT count(*)::integer AS n FROM public.orders WHERE booqable_order_id = 'bq-bad';

SELECT is(
  pg_temp.apply_snap(
    'bq-bad',
    jsonb_build_object(
      'schemaVersion', 1,
      'fetchedAt', '2026-08-21T14:00:00.000Z',
      'sourceStatus', 'reserved',
      'order', jsonb_build_object('booqableOrderId', 'bq-bad'),
      'lines', '[]'::jsonb
    )
  )->>'code',
  'INVALID_SNAPSHOT',
  'missing assignments returns INVALID_SNAPSHOT'
);

SELECT is(
  (SELECT count(*)::integer FROM public.orders WHERE booqable_order_id = 'bq-bad'),
  (SELECT n FROM orders_before_bad),
  'missing assignments writes nothing'
);

SELECT is(
  pg_temp.apply_snap(
    'bq-bad-next',
    pg_temp.road_snap('bq-bad-next') || jsonb_build_object(
      'links', jsonb_build_object('next', 'https://example.test/page=2')
    )
  )->>'code',
  'INVALID_SNAPSHOT',
  'links.next without pages returns INVALID_SNAPSHOT'
);

SELECT is(
  (SELECT count(*)::integer FROM public.orders WHERE booqable_order_id = 'bq-bad-next'),
  0,
  'links.next writes nothing'
);

SELECT is(
  pg_temp.apply_snap(
    'bq-bad-cast',
    jsonb_set(pg_temp.road_snap('bq-bad-cast'), '{order,startsAt}', '"not-a-timestamp"')
  )->>'code',
  'INVALID_SNAPSHOT',
  'invalid startsAt returns INVALID_SNAPSHOT'
);

SELECT is(
  (SELECT count(*)::integer FROM public.orders WHERE booqable_order_id = 'bq-bad-cast'),
  0,
  'invalid startsAt writes nothing'
);

-- Bad lease
SELECT ok(
  ((pg_temp.ensure_lease('bq-stale')).token IS NOT NULL),
  'stale-lease setup acquired a token'
);

SELECT is(
  public.booqable_apply_source_snapshot_v1(
    'bq-stale',
    '00000000-0000-4000-8000-000000000099'::uuid,
    1,
    pg_temp.road_snap('bq-stale')
  )->>'code',
  'STALE_LEASE',
  'wrong token returns STALE_LEASE'
);

SELECT is(
  (SELECT count(*)::integer FROM public.orders WHERE booqable_order_id = 'bq-stale'),
  0,
  'wrong token writes nothing'
);

UPDATE private.booqable_order_leases
SET expires_at = now() - interval '1 second'
WHERE booqable_order_id = 'bq-stale';

SELECT is(
  public.booqable_apply_source_snapshot_v1(
    'bq-stale',
    (SELECT token FROM apply_leases WHERE order_id = 'bq-stale'),
    (SELECT fence FROM apply_leases WHERE order_id = 'bq-stale'),
    pg_temp.road_snap('bq-stale')
  )->>'code',
  'STALE_LEASE',
  'expired token returns STALE_LEASE'
);

-- Staff JWT has no EXECUTE grant
SELECT is(
  has_function_privilege(
    'authenticated',
    'public.booqable_apply_source_snapshot_v1(text,uuid,bigint,jsonb)',
    'EXECUTE'
  ),
  false,
  'authenticated has no EXECUTE on apply'
);

SELECT is(
  has_function_privilege(
    'authenticated',
    'public.booqable_acquire_order_lease(text,timestamptz,text)',
    'EXECUTE'
  ),
  false,
  'authenticated has no EXECUTE on acquire'
);

SELECT is(
  (SELECT count(*)::integer FROM public.orders WHERE booqable_order_id = 'bq-authz'),
  0,
  'staff JWT apply writes nothing'
);

-- Empty extras still fingerprint
SELECT ok(
  (
    pg_temp.apply_snap(
      'bq-empty-extra',
      pg_temp.snap(
        'bq-empty-extra',
        'reserved',
        '2026-12-10T10:00:00Z',
        jsonb_build_array(
          pg_temp.assignment('stock-e', 'sip-e', '["workshop-road-bike"]'::jsonb)
        ),
        jsonb_build_array()
      )
    )->>'ok'
  )::boolean,
  'empty add-on list still applies'
);

SELECT isnt(
  (SELECT addon_fingerprint FROM public.orders WHERE booqable_order_id = 'bq-empty-extra'),
  NULL,
  'empty add-on list still has a fingerprint'
);

-- Enabling a mapping must re-resolve on an unchanged snapshot
UPDATE public.checklist_tag_mappings
SET enabled = false,
    definition_id = NULL
WHERE tag = 'workshop-e-city-bike';
SELECT ok(
  (
    pg_temp.apply_snap(
      'bq-map-enable',
      pg_temp.snap(
        'bq-map-enable',
        'reserved',
        '2026-12-10T10:00:00Z',
        jsonb_build_array(
          pg_temp.assignment(
            'stock-me',
            'sip-me',
            '["workshop-e-city-bike"]'::jsonb,
            'ECF/M-1',
            'E-city'
          )
        ),
        jsonb_build_array(pg_temp.line('e-city-bike', 'E-city', 1))
      )
    )->>'ok'
  )::boolean,
  'e-city setup succeeds'
);

SELECT is(
  (
    SELECT t.has_configuration_warning
    FROM public.bike_tasks t
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-map-enable'
  ),
  true,
  'e-city starts with configuration warning'
);

UPDATE public.checklist_tag_mappings
SET enabled = true,
    definition_id = (
      SELECT d.id
      FROM public.checklist_definitions d
      WHERE d.definition_key = 'road_bike_preparation' AND d.version = 1
    )
WHERE tag = 'workshop-e-city-bike';

SELECT ok(
  (
    pg_temp.apply_snap(
      'bq-map-enable',
      pg_temp.snap(
        'bq-map-enable',
        'reserved',
        '2026-12-10T10:00:00Z',
        jsonb_build_array(
          pg_temp.assignment(
            'stock-me',
            'sip-me',
            '["workshop-e-city-bike"]'::jsonb,
            'ECF/M-1',
            'E-city'
          )
        ),
        jsonb_build_array(pg_temp.line('e-city-bike', 'E-city', 1))
      )
    )->>'ok'
  )::boolean,
  'unchanged snapshot after mapping enable applies'
);

SELECT is(
  (
    SELECT t.has_configuration_warning
    FROM public.bike_tasks t
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-map-enable'
  ),
  false,
  'mapping enable on unchanged snapshot clears warning'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.bike_task_items i
    JOIN public.bike_tasks t ON t.id = i.task_id
    JOIN public.orders o ON o.id = t.order_id
    WHERE o.booqable_order_id = 'bq-map-enable'
      AND i.stage = 'preparation'
  ),
  25,
  'mapping enable on unchanged snapshot copies ROAD items'
);

SELECT * FROM finish();
ROLLBACK;
