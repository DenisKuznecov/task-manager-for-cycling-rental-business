begin;

select plan(42);

select has_table('public', 'booqable_product_groups', 'product groups are persisted');
select has_table('public', 'booqable_products', 'products are persisted');
select has_table('public', 'booqable_bundles', 'bundles are persisted');
select has_table('public', 'booqable_bundle_items', 'bundle items are persisted');
select has_table('public', 'booqable_stock_items', 'stock items are persisted');
select has_table('public', 'booqable_plannings', 'plannings are persisted');
select has_table('public', 'booqable_stock_item_plannings', 'stock item plannings are persisted');
select has_table('public', 'booqable_order_bike_memberships', 'order-bike memberships are persisted');
select has_table('public', 'booqable_membership_predecessors', 'membership predecessors are persisted');
select has_table('public', 'booqable_field_authority_manifest', 'field-authority manifest is persisted');

select has_column('public', 'customers', 'entity_origin', 'customers gain backfill-safe origin');
select has_column('public', 'orders', 'source_lifecycle', 'orders gain explicit open/closed state');
select has_column('public', 'order_items', 'ingested_at', 'order items gain ingestion time');

select col_type_is(
  'public',
  'booqable_product_groups',
  'source_updated_at',
  'timestamp with time zone',
  'product group source time is timestamptz'
);
select col_type_is(
  'public',
  'booqable_product_groups',
  'ingested_at',
  'timestamp with time zone',
  'product group ingestion time is timestamptz'
);
select col_type_is(
  'public',
  'customers',
  'source_updated_at',
  'timestamp with time zone',
  'customer source time is timestamptz'
);

select col_is_unique(
  'public',
  'booqable_order_bike_memberships',
  ARRAY[
    'order_external_id',
    'line_external_id',
    'source_unit_discriminator',
    'replacement_chain_incarnation'
  ],
  'membership identity is unique'
);

insert into public.booqable_product_groups (id, external_id, tag_list)
values (
  '00000000-0000-4000-8000-000000000001',
  'pg_road',
  array['workshop-road-bike', 'season-2026']
);
insert into public.booqable_products (
  id, external_id, product_group_external_id, product_group_id, tag_list
) values (
  '00000000-0000-4000-8000-000000000002',
  'prod_road',
  'pg_road',
  '00000000-0000-4000-8000-000000000001',
  array['workshop-road-bike', 'season-2026']
);
insert into public.booqable_product_groups (id, external_id, tag_list)
values
  (
    '00000000-0000-4000-8000-000000000031',
    'pg_e_road',
    array['workshop-e-road-bike']
  ),
  (
    '00000000-0000-4000-8000-000000000032',
    'pg_e_city',
    array['workshop-e-city-bike']
  ),
  (
    '00000000-0000-4000-8000-000000000033',
    'pg_gravel',
    array['workshop-gravel-bike']
  ),
  (
    '00000000-0000-4000-8000-000000000034',
    'pg_mtb',
    array['workshop-mtb-bike']
  ),
  (
    '00000000-0000-4000-8000-000000000035',
    'pg_e_mtb',
    array['workshop-e-mtb-bike']
  );
insert into public.booqable_products (
  id, external_id, product_group_external_id, product_group_id, tag_list
) values
  (
    '00000000-0000-4000-8000-000000000041',
    'prod_e_road',
    'pg_e_road',
    '00000000-0000-4000-8000-000000000031',
    array['workshop-e-road-bike']
  ),
  (
    '00000000-0000-4000-8000-000000000042',
    'prod_e_city',
    'pg_e_city',
    '00000000-0000-4000-8000-000000000032',
    array['workshop-e-city-bike']
  ),
  (
    '00000000-0000-4000-8000-000000000043',
    'prod_gravel',
    'pg_gravel',
    '00000000-0000-4000-8000-000000000033',
    array['workshop-gravel-bike']
  ),
  (
    '00000000-0000-4000-8000-000000000044',
    'prod_mtb',
    'pg_mtb',
    '00000000-0000-4000-8000-000000000034',
    array['workshop-mtb-bike']
  ),
  (
    '00000000-0000-4000-8000-000000000045',
    'prod_e_mtb',
    'pg_e_mtb',
    '00000000-0000-4000-8000-000000000035',
    array['workshop-e-mtb-bike']
  );
insert into public.booqable_bundles (id, external_id, tag_list)
values (
  '00000000-0000-4000-8000-000000000051',
  'bundle_road',
  array['workshop-road-bike-bundle']
);

select is(
  (
    select array_agg(external_id || ':' || array_to_string(tag_list, ',') order by external_id)
    from public.booqable_product_groups
    where external_id in (
      'pg_road',
      'pg_e_road',
      'pg_e_city',
      'pg_gravel',
      'pg_mtb',
      'pg_e_mtb'
    )
  ),
  array[
    'pg_e_city:workshop-e-city-bike',
    'pg_e_mtb:workshop-e-mtb-bike',
    'pg_e_road:workshop-e-road-bike',
    'pg_gravel:workshop-gravel-bike',
    'pg_mtb:workshop-mtb-bike',
    'pg_road:workshop-road-bike,season-2026'
  ]::text[],
  'all six ProductGroup tag_list values persist as source facts'
);

select is(
  (
    select array_agg(external_id || ':' || array_to_string(tag_list, ',') order by external_id)
    from public.booqable_products
    where external_id in (
      'prod_road',
      'prod_e_road',
      'prod_e_city',
      'prod_gravel',
      'prod_mtb',
      'prod_e_mtb'
    )
  ),
  array[
    'prod_e_city:workshop-e-city-bike',
    'prod_e_mtb:workshop-e-mtb-bike',
    'prod_e_road:workshop-e-road-bike',
    'prod_gravel:workshop-gravel-bike',
    'prod_mtb:workshop-mtb-bike',
    'prod_road:workshop-road-bike,season-2026'
  ]::text[],
  'all six Product tag_list values persist as source facts'
);

select is(
  (
    select tag_list
    from public.booqable_bundles
    where external_id = 'bundle_road'
  ),
  array['workshop-road-bike-bundle']::text[],
  'Bundle tag_list persists as a source fact'
);
insert into public.booqable_order_bike_memberships (
  id,
  order_external_id,
  line_external_id,
  source_unit_discriminator,
  replacement_chain_incarnation
) values (
  '00000000-0000-4000-8000-000000000011',
  'ord_1',
  'line_1',
  'single',
  1
), (
  '00000000-0000-4000-8000-000000000012',
  'ord_1',
  'line_1',
  'si_2',
  2
);
insert into public.booqable_membership_predecessors (successor_id, predecessor_id)
values (
  '00000000-0000-4000-8000-000000000012',
  '00000000-0000-4000-8000-000000000011'
);

select throws_ok(
  $$insert into public.booqable_order_bike_memberships (
      order_external_id,
      line_external_id,
      source_unit_discriminator,
      replacement_chain_incarnation
    ) values ('ord_1', 'line_1', 'single', 1)$$,
  '23505',
  'duplicate key value violates unique constraint "booqable_order_bike_memberships_identity_key"',
  'duplicate membership identity is rejected'
);

select throws_ok(
  $$update public.booqable_order_bike_memberships
    set source_unit_discriminator = 'si_9'
    where id = '00000000-0000-4000-8000-000000000011'$$,
  'P0001',
  'booqable order-bike membership identity is immutable',
  'membership identity cannot change'
);

select throws_ok(
  $$update public.booqable_membership_predecessors
    set predecessor_id = '00000000-0000-4000-8000-000000000012'
    where successor_id = '00000000-0000-4000-8000-000000000012'$$,
  'P0001',
  'booqable membership predecessor links are immutable',
  'predecessor links cannot be updated'
);

select throws_ok(
  $$delete from public.booqable_membership_predecessors
    where successor_id = '00000000-0000-4000-8000-000000000012'$$,
  'P0001',
  'booqable membership predecessor links are immutable',
  'predecessor links cannot be deleted'
);

select throws_ok(
  $$delete from public.booqable_product_groups
    where id = '00000000-0000-4000-8000-000000000001'$$,
  '23503',
  'update or delete on table "booqable_product_groups" violates foreign key constraint "booqable_products_product_group_id_fkey" on table "booqable_products"',
  'referenced product groups are not cascade-deleted'
);

select throws_ok(
  $$delete from public.booqable_order_bike_memberships
    where id = '00000000-0000-4000-8000-000000000011'$$,
  '23503',
  'update or delete on table "booqable_order_bike_memberships" violates foreign key constraint "booqable_membership_predecessors_predecessor_id_fkey" on table "booqable_membership_predecessors"',
  'referenced membership history is not cascade-deleted'
);

select is(
  (select count(*)::integer from public.booqable_field_authority_manifest),
  201,
  'manifest contains one row per projected field'
);

select is(
  (
    select count(*)::integer
    from (
      select entity_origin, field_name
      from public.booqable_field_authority_manifest
      group by entity_origin, field_name
      having count(*) > 1
    ) duplicates
  ),
  0,
  'each (entity_origin, field) appears once'
);

insert into public.customers (id, name, email, booqable_customer_id, entity_origin)
values
  (
    '00000000-0000-4000-8000-000000000021',
    'Local Rider',
    'shared@example.com',
    null,
    'local'
  ),
  (
    '00000000-0000-4000-8000-000000000022',
    'Booqable Rider',
    'shared@example.com',
    'cus_1',
    'booqable'
  );

select is(
  (
    select count(*)::integer
    from public.customers
    where email = 'shared@example.com'
      and id in (
        '00000000-0000-4000-8000-000000000021',
        '00000000-0000-4000-8000-000000000022'
      )
  ),
  2,
  'local and Booqable customers stay separate'
);

select throws_ok(
  $$update public.customers
    set booqable_customer_id = 'cus_merged'
    where id = '00000000-0000-4000-8000-000000000021'$$,
  '23514',
  'new row for relation "customers" violates check constraint "customers_origin_identity_check"',
  'local customers cannot be auto-merged onto a Booqable identity'
);

insert into public.customers (
  id, name, booqable_customer_id, entity_origin, source_lifecycle
) values (
  '00000000-0000-4000-8000-000000000023',
  'Lifecycle Rider',
  'cus_open',
  'booqable',
  null
);

update public.customers
set source_lifecycle = 'open'::public.projection_source_lifecycle
where entity_origin = 'booqable'::public.projection_row_origin
  and source_lifecycle is null;

select is(
  (
    select source_lifecycle::text
    from public.customers
    where id = '00000000-0000-4000-8000-000000000023'
  ),
  'open',
  'booqable customers without a lifecycle backfill to open'
);

select throws_ok(
  $$update public.customers
    set booqable_customer_id = null
    where id = '00000000-0000-4000-8000-000000000022'$$,
  '23514',
  'new row for relation "customers" violates check constraint "customers_origin_identity_check"',
  'booqable-origin customers cannot drop their Booqable identity'
);

select throws_ok(
  $$update public.customers
    set booqable_customer_id = ''
    where id = '00000000-0000-4000-8000-000000000022'$$,
  '23514',
  'new row for relation "customers" violates check constraint "customers_origin_identity_check"',
  'booqable-origin customers cannot use a blank Booqable identity'
);

select ok(
  not has_table_privilege('authenticated', 'public.booqable_product_groups', 'SELECT')
  and not has_table_privilege('authenticated', 'public.booqable_products', 'SELECT')
  and not has_table_privilege('authenticated', 'public.booqable_bundles', 'SELECT')
  and not has_table_privilege('authenticated', 'public.booqable_bundle_items', 'SELECT')
  and not has_table_privilege('authenticated', 'public.booqable_stock_items', 'SELECT'),
  'authenticated users cannot read catalog projection tables'
);

select ok(
  not has_table_privilege('authenticated', 'public.booqable_plannings', 'SELECT')
  and not has_table_privilege('authenticated', 'public.booqable_stock_item_plannings', 'SELECT')
  and not has_table_privilege('authenticated', 'public.booqable_order_bike_memberships', 'SELECT')
  and not has_table_privilege('authenticated', 'public.booqable_membership_predecessors', 'SELECT')
  and not has_table_privilege('authenticated', 'public.booqable_field_authority_manifest', 'SELECT'),
  'authenticated users cannot read membership or manifest tables'
);

select ok(
  not has_table_privilege('anon', 'public.booqable_order_bike_memberships', 'SELECT')
  and not has_table_privilege('anon', 'public.booqable_field_authority_manifest', 'INSERT'),
  'anonymous roles have no projection base-table access'
);

select ok(
  has_table_privilege('service_role', 'public.booqable_order_bike_memberships', 'SELECT')
  and has_table_privilege('service_role', 'public.booqable_field_authority_manifest', 'SELECT'),
  'service_role can read projection base tables'
);

select is(
  (
    select array_agg(a.attname::text order by a.attnum)
    from pg_attribute a
    where a.attrelid = 'public.bookings_view'::regclass
      and a.attnum > 0
      and not a.attisdropped
  ),
  array[
    'id',
    'booqable_order_id',
    'order_number',
    'order_number_text',
    'status',
    'starts_at',
    'stops_at',
    'amount_in_cents',
    'partner_id',
    'created_at',
    'customer_name',
    'customer_email',
    'customer_phone',
    'partner_name',
    'partner_slug'
  ]::text[],
  'bookings_view signature is unchanged'
);

select is(
  (
    select array_agg(a.attname::text order by a.attnum)
    from pg_attribute a
    where a.attrelid = 'public.partner_customers_view'::regclass
      and a.attnum > 0
      and not a.attisdropped
  ),
  array[
    'id',
    'name',
    'email',
    'phone',
    'birthday',
    'partner_id',
    'order_numbers',
    'order_numbers_text'
  ]::text[],
  'partner_customers_view signature is unchanged'
);

select is(
  (
    select array_agg(a.attname::text order by a.attnum)
    from pg_attribute a
    where a.attrelid = 'public.bike_fits_view'::regclass
      and a.attnum > 0
      and not a.attisdropped
  ),
  array[
    'id',
    'fit_number',
    'fit_number_text',
    'customer_id',
    'customer_name',
    'customer_email',
    'customer_phone',
    'created_by',
    'parent_fit_id',
    'date_of_fit',
    'bike_type',
    'status',
    'fit_label',
    'created_at',
    'updated_at'
  ]::text[],
  'bike_fits_view signature is unchanged'
);

select is(
  (
    select count(*)::integer
    from information_schema.referential_constraints
    where constraint_schema = 'public'
      and constraint_name like 'booqable_%'
      and delete_rule = 'CASCADE'
  ),
  0,
  'new projection foreign keys do not cascade-delete'
);

select is(
  (
    select count(*)::integer
    from public.booqable_field_authority_manifest
    where disposition = 'bounded_archived_pii'
      and entity_origin = 'booqable_customer'
  ),
  5,
  'archived Booqable customer PII stays bounded in the manifest'
);

select * from finish();
rollback;
