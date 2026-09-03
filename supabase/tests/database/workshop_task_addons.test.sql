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

CREATE OR REPLACE FUNCTION pg_temp.make_task(
  p_order_id uuid,
  p_stock text,
  p_display text,
  p_title text,
  p_line_id text
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_instance_id uuid;
  v_task_id uuid;
BEGIN
  INSERT INTO public.booqable_assignment_instances (
    order_id, booqable_stock_item_id, bike_display_id, bike_title, booqable_line_id
  ) VALUES (
    p_order_id, p_stock, p_display, p_title, p_line_id
  )
  RETURNING id INTO v_instance_id;

  INSERT INTO public.bike_tasks (
    assignment_instance_id, task_kind, status, version,
    order_id, order_number, starts_at,
    booqable_stock_item_id, bike_display_id, bike_title,
    workshop_tag, has_configuration_warning
  )
  SELECT
    v_instance_id,
    'rental_turnaround',
    'to_prepare',
    1,
    p_order_id,
    o.order_number,
    o.starts_at,
    p_stock,
    p_display,
    p_title,
    'workshop-road-bike',
    false
  FROM public.orders o
  WHERE o.id = p_order_id
  RETURNING id INTO v_task_id;

  RETURN v_task_id;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.addon_titles(p_task_id uuid)
RETURNS text[]
LANGUAGE sql
AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT a->>'title'
      FROM jsonb_array_elements(
        public.workshop_task_detail(p_task_id)->'addons'
      ) AS a
      ORDER BY a->>'title'
    ),
    ARRAY[]::text[]
  );
$$;

SELECT pg_temp.create_staff(
  '11111111-1111-4111-8111-111111111111',
  'ws-addons-mechanic@test.local',
  'Addons',
  'Mechanic',
  'mechanic'::public.user_role
);
SELECT pg_temp.create_staff(
  '22222222-2222-4222-8222-222222222222',
  'ws-addons-partner@test.local',
  'Addons',
  'Partner',
  'partner'::public.user_role
);

INSERT INTO public.orders (
  id, booqable_order_id, order_number, starts_at, stops_at
) VALUES
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001',
    'bq-addons-bundles',
    9201,
    timestamptz '2026-09-14 12:00:00+02',
    timestamptz '2026-09-19 19:00:00+02'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0002',
    'bq-addons-flat',
    9202,
    timestamptz '2026-09-14 12:00:00+02',
    timestamptz '2026-09-19 19:00:00+02'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0003',
    'bq-addons-shared',
    9203,
    timestamptz '2026-09-14 12:00:00+02',
    timestamptz '2026-09-19 19:00:00+02'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0004',
    'bq-addons-empty',
    9204,
    timestamptz '2026-09-14 12:00:00+02',
    timestamptz '2026-09-19 19:00:00+02'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0005',
    'bq-addons-legacy',
    9205,
    timestamptz '2026-09-14 12:00:00+02',
    timestamptz '2026-09-19 19:00:00+02'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0006',
    'bq-addons-persist',
    9206,
    timestamptz '2026-09-14 12:00:00+02',
    timestamptz '2026-09-19 19:00:00+02'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0007',
    'bq-addons-titles',
    9207,
    timestamptz '2026-09-14 12:00:00+02',
    timestamptz '2026-09-19 19:00:00+02'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0008',
    'bq-addons-section',
    9208,
    timestamptz '2026-09-14 12:00:00+02',
    timestamptz '2026-09-19 19:00:00+02'
  );

-- Two bundles
INSERT INTO public.order_items (
  order_id, booqable_line_id, parent_booqable_line_id, title, quantity, position
) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001', 'bundle-m', NULL, 'Road bundle M', 1, 1),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001', 'bike-m', 'bundle-m', 'Focus M', 1, 2),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001', 'helm-m', 'bundle-m', 'Helmet M', 1, 3),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001', 'no-pm-m', 'bundle-m', 'No powermeter', 1, 4),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001', 'bundle-s', NULL, 'Road bundle S', 1, 5),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001', 'bike-s', 'bundle-s', 'Focus S', 1, 6),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001', 'helm-s', 'bundle-s', 'Helmet S', 1, 7);

-- Flat bikes + sibling extras
INSERT INTO public.order_items (
  order_id, booqable_line_id, parent_booqable_line_id, title, quantity, position,
  extra_information
) VALUES
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0002',
    'flat-m',
    NULL,
    'Aventura M',
    1,
    1,
    E'Included:\n-Charger Di2\n-Frame pump'
  ),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0002', 'flat-l', NULL, 'Aventura L', 2, 2, NULL),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0002', 'flat-helm', NULL, 'Helmet Smith', 2, 3, NULL),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0002', 'flat-del', NULL, 'Delivery+Pickup', 1, 4, NULL);

-- Shared qty-2 bundled line plus another package
INSERT INTO public.order_items (
  order_id, booqable_line_id, parent_booqable_line_id, title, quantity, position
) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0003', 'share-bundle', NULL, 'Shared bundle', 1, 1),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0003', 'share-l', 'share-bundle', 'Aventura L shared', 2, 2),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0003', 'share-helm', 'share-bundle', 'Shared helmet', 1, 3),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0003', 'share-no', 'share-bundle', 'No shared pedals', 1, 4),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0003', 'share-other', NULL, 'Other bundle', 1, 5),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0003', 'share-xl', 'share-other', 'Aventura XL', 1, 6);

-- Legacy title match
INSERT INTO public.order_items (
  order_id, booqable_line_id, parent_booqable_line_id, title, quantity, position
) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0005', 'legacy-root', NULL, 'Legacy bundle', 1, 1),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0005', 'legacy-bike', 'legacy-root', 'Legacy Focus', 1, 2),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0005', 'legacy-helm', 'legacy-root', 'Legacy helmet', 1, 3),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0005', 'legacy-other', NULL, 'Other bike', 1, 4);

INSERT INTO public.order_items (
  order_id, booqable_line_id, parent_booqable_line_id, title, quantity, position
) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0006', 'persist-line', NULL, 'Persist Bike', 1, 1);

INSERT INTO public.order_items (
  order_id, booqable_line_id, parent_booqable_line_id, title, quantity, position
) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0007', 'dup-wrap-a', NULL, 'Package A', 1, 1),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0007', 'dup-a', 'dup-wrap-a', 'Same Title Bike', 1, 2),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0007', 'dup-a-extra', 'dup-wrap-a', 'Extra A', 1, 3),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0007', 'dup-wrap-b', NULL, 'Package B', 1, 4),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0007', 'dup-b', 'dup-wrap-b', 'Same Title Bike', 1, 5),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0007', 'dup-b-extra', 'dup-wrap-b', 'Extra B', 1, 6),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0007', 'dup-other', NULL, 'Unrelated extra', 1, 7);

-- Section → bundle → bike + extras (and an extra nested under the bike)
INSERT INTO public.order_items (
  order_id, booqable_line_id, parent_booqable_line_id, title, quantity, position, line_type
) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0008', 'sec-root', NULL, 'Road section', 1, 1, 'section'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0008', 'sec-bundle', 'sec-root', 'Road bundle nested', 1, 2, 'charge'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0008', 'sec-bike', 'sec-bundle', 'Section Focus', 1, 3, 'charge'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0008', 'sec-helm', 'sec-bundle', 'Section helmet', 1, 4, 'charge'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0008', 'sec-nested', 'sec-bike', 'Section nest extra', 1, 5, 'charge'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0008', 'sec-no', 'sec-bundle', 'No section pedals', 1, 6, 'charge');

CREATE TEMP TABLE ws_addon_ids (
  bundle_m uuid,
  bundle_s uuid,
  flat_m uuid,
  flat_l uuid,
  share_a uuid,
  share_b uuid,
  empty uuid,
  legacy uuid,
  titles uuid,
  titles_a uuid,
  titles_b uuid,
  section uuid
);

INSERT INTO ws_addon_ids
SELECT
  pg_temp.make_task(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001', 'stock-m', 'ECF/M-1', 'Focus M', 'bike-m'
  ),
  pg_temp.make_task(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001', 'stock-s', 'ECF/S-1', 'Focus S', 'bike-s'
  ),
  pg_temp.make_task(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0002', 'stock-fm', 'ECF/M-2', 'Aventura M', 'flat-m'
  ),
  pg_temp.make_task(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0002', 'stock-fl', 'ECF/L-1', 'Aventura L', 'flat-l'
  ),
  pg_temp.make_task(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0003', 'stock-sa', 'ECF/L-2', 'Aventura L shared', 'share-l'
  ),
  pg_temp.make_task(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0003', 'stock-sb', 'ECF/L-3', 'Aventura L shared', 'share-l'
  ),
  pg_temp.make_task(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0004', 'stock-e', 'ECF/E-1', 'Empty bike', 'gone-line'
  ),
  pg_temp.make_task(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0005', 'stock-leg', 'ECF/G-1', 'Legacy Focus', NULL
  ),
  pg_temp.make_task(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0007', 'stock-dup', 'ECF/D-1', 'Same Title Bike', NULL
  ),
  pg_temp.make_task(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0007', 'stock-dup-a', 'ECF/D-2', 'Same Title Bike', 'dup-a'
  ),
  pg_temp.make_task(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0007', 'stock-dup-b', 'ECF/D-3', 'Same Title Bike', 'dup-b'
  ),
  pg_temp.make_task(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0008', 'stock-sec', 'ECF/N-1', 'Section Focus', 'sec-bike'
  );

GRANT SELECT ON ws_addon_ids TO authenticated;
GRANT EXECUTE ON FUNCTION pg_temp.addon_titles(uuid) TO authenticated;

SELECT private.booqable_create_instance_task_inner(
  (SELECT o FROM public.orders o WHERE o.id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0006'),
  jsonb_build_object(
    'stockItemId', 'stock-persist',
    'sipId', 'sip-persist',
    'booqableLineId', 'persist-line',
    'displayId', 'P-1',
    'title', 'Persist Bike',
    'workshopTags', '[]'::jsonb
  ),
  'fp-persist'
);

SELECT is(
  (
    SELECT i.booqable_line_id
    FROM public.booqable_assignment_instances i
    WHERE i.order_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0006'
      AND i.booqable_stock_item_id = 'stock-persist'
  ),
  'persist-line',
  'create inner persists booqable_line_id'
);

SELECT private.booqable_sync_retained_task(
  (SELECT o FROM public.orders o WHERE o.id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0006'),
  (
    SELECT i
    FROM public.booqable_assignment_instances i
    WHERE i.order_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0006'
      AND i.booqable_stock_item_id = 'stock-persist'
  ),
  jsonb_build_object(
    'stockItemId', 'stock-persist',
    'sipId', 'sip-persist',
    'displayId', 'P-1',
    'title', 'Persist Bike',
    'workshopTags', '[]'::jsonb
  ),
  'fp-persist-2'
);

SELECT is(
  (
    SELECT i.booqable_line_id
    FROM public.booqable_assignment_instances i
    WHERE i.order_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0006'
      AND i.booqable_stock_item_id = 'stock-persist'
  ),
  'persist-line',
  'retain without booqableLineId keeps the existing row id'
);

SELECT pg_temp.become('11111111-1111-4111-8111-111111111111');
SET ROLE authenticated;

SELECT is(
  pg_temp.addon_titles((SELECT bundle_m FROM ws_addon_ids)),
  ARRAY['Focus M', 'Helmet M', 'No powermeter']::text[],
  'two bundles: M task sees bike and extras, not the wrapper'
);
SELECT is(
  pg_temp.addon_titles((SELECT bundle_s FROM ws_addon_ids)),
  ARRAY['Focus S', 'Helmet S']::text[],
  'two bundles: S task sees bike and extras, not the wrapper'
);
SELECT is(
  (
    public.workshop_task_detail((SELECT bundle_m FROM ws_addon_ids))
    -> 'task' ->> 'stops_at'
  ) IS NOT NULL,
  true,
  'workshop_task_detail still includes order stops_at'
);

SELECT is(
  pg_temp.addon_titles((SELECT flat_m FROM ws_addon_ids)),
  ARRAY['Aventura M']::text[],
  'flat: M task sees only its bike row'
);
SELECT is(
  (
    SELECT a->>'extraInformation'
    FROM jsonb_array_elements(
      public.workshop_task_detail((SELECT flat_m FROM ws_addon_ids))->'addons'
    ) a
    WHERE a->>'title' = 'Aventura M'
  ),
  E'Included:\n-Charger Di2\n-Frame pump',
  'flat: extraInformation is returned for the seed row'
);
SELECT is(
  pg_temp.addon_titles((SELECT flat_l FROM ws_addon_ids)),
  ARRAY['Aventura L']::text[],
  'flat: L task sees only its bike row'
);
SELECT is(
  (
    SELECT a->>'extraInformation'
    FROM jsonb_array_elements(
      public.workshop_task_detail((SELECT flat_l FROM ws_addon_ids))->'addons'
    ) a
    WHERE a->>'title' = 'Aventura L'
  ),
  NULL,
  'flat: extraInformation is null when unset'
);

SELECT is(
  pg_temp.addon_titles((SELECT share_a FROM ws_addon_ids)),
  ARRAY['Aventura L shared', 'No shared pedals', 'Shared helmet']::text[],
  'bundled qty-2: first task sees that package as its own'
);
SELECT is(
  pg_temp.addon_titles((SELECT share_b FROM ws_addon_ids)),
  ARRAY['Aventura L shared', 'No shared pedals', 'Shared helmet']::text[],
  'bundled qty-2: second task sees that package as its own'
);
SELECT is(
  (
    SELECT count(*)::integer
    FROM unnest(pg_temp.addon_titles((SELECT share_a FROM ws_addon_ids))) t(title)
    WHERE title IN ('Shared bundle', 'Other bundle', 'Aventura XL')
  ),
  0,
  'bundled qty-2: wrapper and other package stay hidden'
);

SELECT is(
  pg_temp.addon_titles((SELECT empty FROM ws_addon_ids)),
  ARRAY[]::text[],
  'unknown line id: addons is empty'
);

SELECT is(
  pg_temp.addon_titles((SELECT legacy FROM ws_addon_ids)),
  ARRAY[]::text[],
  'unlinked: missing line id yields empty addons, no title fallback'
);
SELECT is(
  pg_temp.addon_titles((SELECT section FROM ws_addon_ids)),
  ARRAY['No section pedals', 'Section Focus', 'Section helmet', 'Section nest extra']::text[],
  'section over bundle: omits section and bundle, keeps bike and extras'
);

SELECT is(
  pg_temp.addon_titles((SELECT titles FROM ws_addon_ids)),
  ARRAY[]::text[],
  'same title, unlinked: empty even when other packages match the title'
);
SELECT is(
  pg_temp.addon_titles((SELECT titles_a FROM ws_addon_ids)),
  ARRAY['Extra A', 'Same Title Bike']::text[],
  'same title with line id: A task sees only package A'
);
SELECT is(
  pg_temp.addon_titles((SELECT titles_b FROM ws_addon_ids)),
  ARRAY['Extra B', 'Same Title Bike']::text[],
  'same title with line id: B task sees only package B'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM jsonb_array_elements(
      public.workshop_task_detail((SELECT share_a FROM ws_addon_ids))->'addons'
    ) a
    WHERE a->>'id' IS NOT NULL
      AND a->>'title' = 'Aventura L shared'
      AND (a->>'quantity')::integer = 2
      AND a ? 'lineType'
      AND a ? 'extraInformation'
  ),
  'scoped addon payload keeps id, quantity, lineType, and extraInformation'
);

RESET ROLE;

SELECT pg_temp.become('22222222-2222-4222-8222-222222222222');
SET ROLE authenticated;

SELECT is(
  public.workshop_task_detail((SELECT bundle_m FROM ws_addon_ids)),
  NULL,
  'partner workshop_task_detail is null'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
