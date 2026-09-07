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

SELECT pg_temp.create_staff(
  '11111111-1111-4111-8111-111111111111',
  'ws-queue-mechanic@test.local',
  'Queue',
  'Mechanic',
  'mechanic'::public.user_role
);

INSERT INTO public.customers (id, name, email)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Queue Customer', 'queue-cust@test.local'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Unrelated Customer', 'unrelated-cust@test.local');

INSERT INTO public.orders (
  id, booqable_order_id, order_number, starts_at, stops_at, customer_id
) VALUES (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'bq-queue-task',
  9101,
  timestamptz '2026-08-24 08:00:00+02',
  timestamptz '2026-08-26 18:00:00+02',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
);

INSERT INTO public.booqable_assignment_instances (
  order_id, booqable_stock_item_id, bike_display_id, bike_title
) VALUES (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'stock-queue-1',
  'QH-101',
  'Queue Road'
);

INSERT INTO public.bike_tasks (
  assignment_instance_id, task_kind, status, version,
  order_id, order_number, starts_at,
  booqable_stock_item_id, bike_display_id, bike_title,
  workshop_tag, has_configuration_warning
)
SELECT
  i.id,
  'rental_turnaround',
  'to_prepare',
  1,
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  9101,
  timestamptz '2026-08-24 08:00:00+02',
  i.booqable_stock_item_id,
  i.bike_display_id,
  i.bike_title,
  'workshop-road-bike',
  false
FROM public.booqable_assignment_instances i
WHERE i.order_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

SELECT has_column(
  'public',
  'workshop_tasks_view',
  'stops_at',
  'workshop_tasks_view exposes stops_at'
);
SELECT has_column(
  'public',
  'workshop_tasks_view',
  'customer_name',
  'workshop_tasks_view exposes customer_name'
);

SELECT pg_temp.become('11111111-1111-4111-8111-111111111111');
SET ROLE authenticated;

SELECT is(
  (
    SELECT v.customer_name
    FROM public.workshop_tasks_view v
    WHERE v.order_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
  ),
  'Queue Customer',
  'mechanic reads customer_name from workshop_tasks_view on a task order'
);
SELECT is(
  (
    SELECT v.stops_at
    FROM public.workshop_tasks_view v
    WHERE v.order_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
  ),
  timestamptz '2026-08-26 18:00:00+02',
  'mechanic reads stops_at from workshop_tasks_view on a task order'
);
SELECT ok(
  (
    public.workshop_task_detail((
      SELECT t.id FROM public.bike_tasks t
      WHERE t.order_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
    )) -> 'task' ->> 'stops_at'
  ) IS NOT NULL,
  'workshop_task_detail includes order stops_at'
);
SELECT is(
  (SELECT count(*)::integer FROM public.customers
    WHERE id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  1,
  'mechanic can SELECT an unrelated customer'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
