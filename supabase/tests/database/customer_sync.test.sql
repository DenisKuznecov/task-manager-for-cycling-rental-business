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

SELECT hasnt_column(
  'public', 'customers', 'landing_google_id',
  'customers.landing_google_id is gone'
);
SELECT hasnt_column(
  'public', 'customers', 'landing_google_status',
  'customers.landing_google_status is gone'
);
SELECT hasnt_column(
  'public', 'customers', 'landing_google_error',
  'customers.landing_google_error is gone'
);
SELECT hasnt_column(
  'public', 'customers', 'landing_holded_id',
  'customers.landing_holded_id is gone'
);
SELECT hasnt_column(
  'public', 'customers', 'landing_holded_status',
  'customers.landing_holded_status is gone'
);
SELECT hasnt_column(
  'public', 'customers', 'landing_holded_error',
  'customers.landing_holded_error is gone'
);
SELECT hasnt_column(
  'public', 'customers', 'landing_mailchimp_id',
  'customers.landing_mailchimp_id is gone'
);
SELECT hasnt_column(
  'public', 'customers', 'landing_mailchimp_status',
  'customers.landing_mailchimp_status is gone'
);
SELECT hasnt_column(
  'public', 'customers', 'landing_mailchimp_error',
  'customers.landing_mailchimp_error is gone'
);
SELECT hasnt_column(
  'public', 'customers', 'landing_at',
  'customers.landing_at is gone'
);

SELECT col_is_null(
  'public', 'customers', 'address_street',
  'customers.address_street is nullable'
);
SELECT col_is_null(
  'public', 'customers', 'address_city',
  'customers.address_city is nullable'
);
SELECT col_is_null(
  'public', 'customers', 'address_region',
  'customers.address_region is nullable'
);
SELECT col_is_null(
  'public', 'customers', 'address_zip',
  'customers.address_zip is nullable'
);
SELECT col_is_null(
  'public', 'customers', 'address_country',
  'customers.address_country is nullable'
);

SELECT col_is_pk(
  'public', 'customer_sync', 'customer_id',
  'customer_sync is 1:1 on customer_id'
);
SELECT is(
  (
    SELECT c.confdeltype
    FROM pg_constraint c
    WHERE c.conrelid = 'public.customer_sync'::regclass
      AND c.contype = 'f'
      AND c.conkey = ARRAY[
        (
          SELECT a.attnum
          FROM pg_attribute a
          WHERE a.attrelid = 'public.customer_sync'::regclass
            AND a.attname = 'customer_id'
        )
      ]
  ),
  'c',
  'customer_sync.customer_id ON DELETE CASCADE'
);

SELECT ok(
  (
    SELECT c.reloptions @> ARRAY['security_invoker=true']
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'customer_sync_list'
  ),
  'customer_sync_list is security_invoker'
);

SELECT has_column('public', 'customer_sync_list', 'id', 'view has id');
SELECT has_column('public', 'customer_sync_list', 'name', 'view has name');
SELECT has_column('public', 'customer_sync_list', 'email', 'view has email');
SELECT has_column('public', 'customer_sync_list', 'phone', 'view has phone');
SELECT has_column('public', 'customer_sync_list', 'birthday', 'view has birthday');
SELECT has_column(
  'public', 'customer_sync_list', 'address_street', 'view has address_street'
);
SELECT has_column(
  'public', 'customer_sync_list', 'address_city', 'view has address_city'
);
SELECT has_column(
  'public', 'customer_sync_list', 'address_region', 'view has address_region'
);
SELECT has_column(
  'public', 'customer_sync_list', 'address_zip', 'view has address_zip'
);
SELECT has_column(
  'public', 'customer_sync_list', 'address_country', 'view has address_country'
);
SELECT has_column(
  'public',
  'customer_sync_list',
  'booqable_customer_id',
  'view has booqable_customer_id'
);
SELECT has_column(
  'public', 'customer_sync_list', 'synced_at', 'view has synced_at'
);
SELECT has_column(
  'public', 'customer_sync_list', 'google_status', 'view has google_status'
);
SELECT has_column(
  'public', 'customer_sync_list', 'google_error', 'view has google_error'
);
SELECT has_column(
  'public', 'customer_sync_list', 'holded_status', 'view has holded_status'
);
SELECT has_column(
  'public', 'customer_sync_list', 'holded_error', 'view has holded_error'
);
SELECT has_column(
  'public', 'customer_sync_list', 'mailchimp_status', 'view has mailchimp_status'
);
SELECT has_column(
  'public', 'customer_sync_list', 'mailchimp_error', 'view has mailchimp_error'
);
SELECT hasnt_column(
  'public', 'customer_sync_list', 'google_id', 'view has no google_id'
);
SELECT hasnt_column(
  'public', 'customer_sync_list', 'holded_id', 'view has no holded_id'
);
SELECT hasnt_column(
  'public', 'customer_sync_list', 'mailchimp_id', 'view has no mailchimp_id'
);

SELECT is(
  has_column_privilege(
    'authenticated',
    'public.customer_sync',
    'google_status',
    'SELECT'
  ),
  true,
  'authenticated can SELECT customer_sync status columns'
);
SELECT is(
  has_table_privilege('authenticated', 'public.customer_sync', 'INSERT'),
  false,
  'authenticated cannot INSERT customer_sync'
);
SELECT is(
  has_table_privilege('authenticated', 'public.customer_sync', 'UPDATE'),
  false,
  'authenticated cannot UPDATE customer_sync'
);
SELECT is(
  has_table_privilege('authenticated', 'public.customer_sync', 'DELETE'),
  false,
  'authenticated cannot DELETE customer_sync'
);
SELECT is(
  has_table_privilege('authenticated', 'public.customer_sync_list', 'SELECT'),
  true,
  'authenticated can SELECT customer_sync_list'
);
SELECT is(
  has_table_privilege('authenticated', 'public.customer_sync_list', 'INSERT'),
  false,
  'authenticated cannot INSERT customer_sync_list'
);
SELECT is(
  has_table_privilege('authenticated', 'public.customer_sync_list', 'UPDATE'),
  false,
  'authenticated cannot UPDATE customer_sync_list'
);
SELECT is(
  has_table_privilege('authenticated', 'public.customer_sync_list', 'DELETE'),
  false,
  'authenticated cannot DELETE customer_sync_list'
);
SELECT is(
  has_table_privilege('service_role', 'public.customer_sync', 'INSERT'),
  true,
  'service_role can INSERT customer_sync'
);
SELECT is(
  has_table_privilege('service_role', 'public.customer_sync', 'UPDATE'),
  true,
  'service_role can UPDATE customer_sync'
);
SELECT is(
  has_table_privilege('anon', 'public.customer_sync', 'SELECT'),
  false,
  'anon has no SELECT on customer_sync'
);
SELECT is(
  has_table_privilege('anon', 'public.customer_sync_list', 'SELECT'),
  false,
  'anon has no SELECT on customer_sync_list'
);

SELECT pg_temp.create_staff(
  '01010101-0101-4101-8101-010101010101',
  'csync-admin@test.local',
  'Ada',
  'Admin',
  'admin'::public.user_role
);
SELECT pg_temp.create_staff(
  '02020202-0202-4202-8202-020202020202',
  'csync-manager@test.local',
  'Mia',
  'Manager',
  'manager'::public.user_role
);
SELECT pg_temp.create_staff(
  '03030303-0303-4303-8303-030303030303',
  'csync-mechanic@test.local',
  'Mo',
  'Mechanic',
  'mechanic'::public.user_role
);
SELECT pg_temp.create_staff(
  '04040404-0404-4404-8404-040404040404',
  'csync-partner@test.local',
  'Pat',
  'Partner',
  'partner'::public.user_role
);

INSERT INTO public.partners (id, name, slug)
VALUES (
  '05050505-0505-4505-8505-050505050505',
  'CSync Partner',
  'csync-partner'
);

UPDATE public.profiles
SET partner_id = '05050505-0505-4505-8505-050505050505'
WHERE id = '04040404-0404-4404-8404-040404040404';

INSERT INTO public.customers (
  id,
  name,
  email,
  phone,
  birthday,
  address_street,
  address_city,
  address_region,
  address_zip,
  address_country,
  booqable_customer_id
) VALUES
  (
    'a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0a0',
    'List Rider',
    'list-rider@test.local',
    '+34000',
    date '1990-01-15',
    'Carrer de Mallorca 1',
    'Barcelona',
    'Catalunya',
    '08013',
    'ES',
    'bq-csync-list'
  ),
  (
    'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0',
    'Bike Fit Only',
    'bikefit@test.local',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'bq-csync-bikefit'
  ),
  (
    'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0',
    'Check Rider',
    'check-rider@test.local',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'bq-csync-check'
  ),
  (
    'd0d0d0d0-d0d0-40d0-80d0-d0d0d0d0d0d0',
    'Service Rider',
    'service-rider@test.local',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'bq-csync-service'
  ),
  (
    'e0e0e0e0-e0e0-40e0-80e0-e0e0e0e0e0e0',
    'Cascade Rider',
    'cascade-rider@test.local',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'bq-csync-cascade'
  );

INSERT INTO public.customer_sync (
  customer_id,
  google_id,
  google_status,
  google_error,
  holded_id,
  holded_status,
  holded_error,
  mailchimp_id,
  mailchimp_status,
  mailchimp_error,
  synced_at
) VALUES
  (
    'a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0a0',
    'g-list',
    'green',
    NULL,
    'h-list',
    'red',
    'holded failed',
    'm-list',
    'green',
    NULL,
    timestamptz '2026-09-01 10:00:00+00'
  ),
  (
    'e0e0e0e0-e0e0-40e0-80e0-e0e0e0e0e0e0',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    timestamptz '2026-09-01 09:00:00+00'
  );

INSERT INTO public.orders (
  id, booqable_order_id, order_number, customer_id, partner_id
) VALUES (
  'f0f0f0f0-f0f0-40f0-80f0-f0f0f0f0f0f0',
  'bq-csync-partner-order',
  9201,
  'a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0a0',
  '05050505-0505-4505-8505-050505050505'
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('bike-fit-images', 'bike-fit-images', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.objects (bucket_id, name)
VALUES ('bike-fit-images', 'mechanic-read-test/reference-photo.jpg');

SELECT pg_temp.become('01010101-0101-4101-8101-010101010101');
SET ROLE authenticated;

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.customer_sync
    WHERE customer_id = 'a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0a0'
  ),
  1,
  'admin reads customer_sync row'
);
SELECT is(
  (
    SELECT row(
      v.name,
      v.email,
      v.phone,
      v.birthday,
      v.address_street,
      v.address_city,
      v.address_region,
      v.address_zip,
      v.address_country,
      v.booqable_customer_id,
      v.synced_at,
      v.google_status,
      v.google_error,
      v.holded_status,
      v.holded_error,
      v.mailchimp_status,
      v.mailchimp_error
    )
    FROM public.customer_sync_list v
    WHERE v.id = 'a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0a0'
  ),
  row(
    'List Rider'::text,
    'list-rider@test.local'::text,
    '+34000'::text,
    date '1990-01-15',
    'Carrer de Mallorca 1'::text,
    'Barcelona'::text,
    'Catalunya'::text,
    '08013'::text,
    'ES'::text,
    'bq-csync-list'::text,
    timestamptz '2026-09-01 10:00:00+00',
    'green'::text,
    NULL::text,
    'red'::text,
    'holded failed'::text,
    'green'::text,
    NULL::text
  ),
  'admin reads contact and dest columns on customer_sync_list'
);
SELECT is(
  (
    SELECT count(*)::integer
    FROM public.customer_sync_list
    WHERE id = 'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0'
  ),
  0,
  'customer without customer_sync is absent from customer_sync_list'
);

RESET ROLE;

SELECT pg_temp.become('02020202-0202-4202-8202-020202020202');
SET ROLE authenticated;

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.customer_sync
    WHERE customer_id = 'a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0a0'
  ),
  1,
  'manager reads customer_sync row'
);
SELECT is(
  (
    SELECT count(*)::integer
    FROM public.customer_sync_list
    WHERE id = 'a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0a0'
  ),
  1,
  'manager reads customer_sync_list row'
);

RESET ROLE;

SELECT pg_temp.become('03030303-0303-4303-8303-030303030303');
SET ROLE authenticated;

SELECT is(
  (
    SELECT row(
      s.google_status,
      s.google_error,
      s.holded_status,
      s.holded_error,
      s.mailchimp_status,
      s.mailchimp_error
    )
    FROM public.customer_sync AS s
    WHERE s.customer_id = 'a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0a0'
  ),
  row(
    'green'::text,
    NULL::text,
    'red'::text,
    'holded failed'::text,
    'green'::text,
    NULL::text
  ),
  'mechanic reads customer_sync statuses and errors'
);
SELECT is(
  (SELECT count(*)::integer FROM public.customer_sync_list),
  2,
  'mechanic reads customer_sync_list rows'
);
SELECT is(
  has_column_privilege(
    'authenticated',
    'public.customer_sync',
    'google_id',
    'SELECT'
  ),
  false,
  'authenticated cannot SELECT Google destination IDs'
);
SELECT is(
  has_column_privilege(
    'authenticated',
    'public.customer_sync',
    'holded_id',
    'SELECT'
  ),
  false,
  'authenticated cannot SELECT Holded destination IDs'
);
SELECT is(
  has_column_privilege(
    'authenticated',
    'public.customer_sync',
    'mailchimp_id',
    'SELECT'
  ),
  false,
  'authenticated cannot SELECT Mailchimp destination IDs'
);
SELECT throws_ok(
  'SELECT google_id FROM public.customer_sync',
  '42501',
  NULL,
  'mechanic cannot query Google destination IDs'
);
SELECT is(
  (
    SELECT count(*)::integer
    FROM storage.objects
    WHERE bucket_id = 'bike-fit-images'
      AND name = 'mechanic-read-test/reference-photo.jpg'
  ),
  1,
  'mechanic can SELECT private bike fit reference images'
);
SELECT throws_ok(
  $$INSERT INTO storage.objects (bucket_id, name)
    VALUES ('bike-fit-images', 'mechanic-read-test/forbidden-upload.jpg')$$,
  '42501',
  NULL,
  'mechanic cannot upload bike fit reference images'
);

RESET ROLE;

SELECT pg_temp.become('04040404-0404-4404-8404-040404040404');
SET ROLE authenticated;

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.customers
    WHERE id = 'a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0a0'
  ),
  1,
  'partner can SELECT the customer they are denied sync for'
);
SELECT is(
  (
    SELECT count(*)::integer
    FROM public.customer_sync
    WHERE customer_id = 'a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0a0'
  ),
  0,
  'partner cannot SELECT customer_sync for a customer they can read'
);
SELECT is(
  (
    SELECT count(*)::integer
    FROM public.customer_sync_list
    WHERE id = 'a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0a0'
  ),
  0,
  'partner cannot SELECT customer_sync_list for a customer they can read'
);
SELECT is(
  (
    SELECT count(*)::integer
    FROM storage.objects
    WHERE bucket_id = 'bike-fit-images'
      AND name = 'mechanic-read-test/reference-photo.jpg'
  ),
  0,
  'partner cannot SELECT private bike fit reference images'
);

RESET ROLE;

SET ROLE anon;

SELECT throws_ok(
  'SELECT 1 FROM public.customer_sync',
  '42501',
  NULL,
  'anon has no privilege on customer_sync'
);
SELECT throws_ok(
  'SELECT 1 FROM public.customer_sync_list',
  '42501',
  NULL,
  'anon has no privilege on customer_sync_list'
);

RESET ROLE;

SELECT pg_temp.become('01010101-0101-4101-8101-010101010101');
SET ROLE authenticated;

SELECT throws_ok(
  $$INSERT INTO public.customer_sync (customer_id, synced_at)
    VALUES ('c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0', now())$$,
  '42501',
  NULL,
  'authenticated cannot INSERT customer_sync'
);
SELECT throws_ok(
  $$UPDATE public.customer_sync
    SET google_error = 'x'
    WHERE customer_id = 'a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0a0'$$,
  '42501',
  NULL,
  'authenticated cannot UPDATE customer_sync'
);
SELECT throws_ok(
  $$DELETE FROM public.customer_sync
    WHERE customer_id = 'a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0a0'$$,
  '42501',
  NULL,
  'authenticated cannot DELETE customer_sync'
);

RESET ROLE;

SET ROLE service_role;

INSERT INTO public.customer_sync (
  customer_id,
  google_id,
  google_status,
  holded_id,
  holded_status,
  mailchimp_id,
  mailchimp_status,
  synced_at
) VALUES (
  'd0d0d0d0-d0d0-40d0-80d0-d0d0d0d0d0d0',
  'g-svc',
  'green',
  'h-svc',
  'green',
  'm-svc',
  'green',
  timestamptz '2026-09-01 12:00:00+00'
)
ON CONFLICT (customer_id) DO UPDATE SET
  google_id = EXCLUDED.google_id,
  google_status = EXCLUDED.google_status,
  holded_id = EXCLUDED.holded_id,
  holded_status = EXCLUDED.holded_status,
  mailchimp_id = EXCLUDED.mailchimp_id,
  mailchimp_status = EXCLUDED.mailchimp_status,
  synced_at = EXCLUDED.synced_at;

INSERT INTO public.customer_sync (
  customer_id,
  google_id,
  google_status,
  holded_id,
  holded_status,
  mailchimp_id,
  mailchimp_status,
  synced_at
) VALUES (
  'a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0a0',
  'g-list-upd',
  'red',
  'h-list-upd',
  'green',
  'm-list-upd',
  'red',
  timestamptz '2026-09-01 13:00:00+00'
)
ON CONFLICT (customer_id) DO UPDATE SET
  google_id = EXCLUDED.google_id,
  google_status = EXCLUDED.google_status,
  holded_id = EXCLUDED.holded_id,
  holded_status = EXCLUDED.holded_status,
  mailchimp_id = EXCLUDED.mailchimp_id,
  mailchimp_status = EXCLUDED.mailchimp_status,
  synced_at = EXCLUDED.synced_at;

RESET ROLE;

SELECT is(
  (
    SELECT row(s.google_id, s.holded_id, s.mailchimp_id, s.google_status)
    FROM public.customer_sync s
    WHERE s.customer_id = 'd0d0d0d0-d0d0-40d0-80d0-d0d0d0d0d0d0'
  ),
  row('g-svc'::text, 'h-svc'::text, 'm-svc'::text, 'green'::text),
  'service_role insert persists dests on a new row'
);
SELECT is(
  (
    SELECT row(
      s.google_id,
      s.google_status,
      s.holded_id,
      s.holded_status,
      s.mailchimp_id,
      s.mailchimp_status,
      s.synced_at
    )
    FROM public.customer_sync s
    WHERE s.customer_id = 'a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0a0'
  ),
  row(
    'g-list-upd'::text,
    'red'::text,
    'h-list-upd'::text,
    'green'::text,
    'm-list-upd'::text,
    'red'::text,
    timestamptz '2026-09-01 13:00:00+00'
  ),
  'service_role upsert updates dests and synced_at on conflict'
);

SELECT throws_ok(
  $$INSERT INTO public.customer_sync (customer_id, google_status, synced_at)
    VALUES (
      'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0',
      'yellow',
      now()
    )$$,
  '23514',
  NULL,
  'google_status yellow is rejected'
);
SELECT throws_ok(
  $$INSERT INTO public.customer_sync (customer_id, holded_status, synced_at)
    VALUES (
      'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0',
      'yellow',
      now()
    )$$,
  '23514',
  NULL,
  'holded_status yellow is rejected'
);
SELECT throws_ok(
  $$INSERT INTO public.customer_sync (customer_id, mailchimp_status, synced_at)
    VALUES (
      'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0',
      'yellow',
      now()
    )$$,
  '23514',
  NULL,
  'mailchimp_status yellow is rejected'
);

SELECT lives_ok(
  $$INSERT INTO public.customer_sync (customer_id, google_status, synced_at)
    VALUES (
      'c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0',
      NULL,
      timestamptz '2026-09-01 11:00:00+00'
    )$$,
  'NULL dest status is allowed'
);

DELETE FROM public.customers
WHERE id = 'e0e0e0e0-e0e0-40e0-80e0-e0e0e0e0e0e0';

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.customer_sync
    WHERE customer_id = 'e0e0e0e0-e0e0-40e0-80e0-e0e0e0e0e0e0'
  ),
  0,
  'deleting a customer cascades to customer_sync'
);

SELECT * FROM finish();
ROLLBACK;
