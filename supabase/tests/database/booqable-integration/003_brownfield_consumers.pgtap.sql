begin;

select plan(7);

select is(
  (
    select count(*)::integer
    from pg_attribute a
    where a.attrelid = 'public.bookings_view'::regclass
      and a.attnum > 0
      and not a.attisdropped
      and a.attname = any(array[
        'entity_origin',
        'source_lifecycle',
        'source_version',
        'source_updated_at',
        'ingested_at'
      ])
  ),
  0,
  'bookings_view omits new source columns'
);

select is(
  (
    select count(*)::integer
    from pg_attribute a
    where a.attrelid = 'public.partner_customers_view'::regclass
      and a.attnum > 0
      and not a.attisdropped
      and a.attname = any(array[
        'entity_origin',
        'source_lifecycle',
        'source_version',
        'source_updated_at',
        'ingested_at'
      ])
  ),
  0,
  'partner_customers_view omits new source columns'
);

select is(
  (
    select count(*)::integer
    from pg_attribute a
    where a.attrelid = 'public.bike_fits_view'::regclass
      and a.attnum > 0
      and not a.attisdropped
      and a.attname = any(array[
        'entity_origin',
        'source_lifecycle',
        'source_version',
        'source_updated_at',
        'ingested_at'
      ])
  ),
  0,
  'bike_fits_view omits new source columns'
);

select is(
  (
    select array_agg(x.argname order by x.ord)
    from (
      select
        unnest(p.proargnames) as argname,
        unnest(p.proargmodes) as argmode,
        generate_subscripts(p.proargnames, 1) as ord
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'get_partner_daily_stats'
    ) x
    where x.argmode = 't'
  ),
  array['stat_date', 'daily_orders', 'daily_cents']::text[],
  'get_partner_daily_stats returns only brownfield stats columns'
);

select lives_ok(
  $$insert into public.customers (
      booqable_customer_id, name, email, phone, birthday, sex
    )
    values (
      null,
      'Legacy Local',
      'legacy-local-2-6@example.com',
      '+34600000000',
      '1990-01-15',
      'female'
    )$$,
  'local-customer insert without new source columns succeeds'
);

select ok(
  exists(
    select 1
    from public.customers
    where email = 'legacy-local-2-6@example.com'
      and booqable_customer_id is null
  ),
  'legacy local insert stays distinct from Booqable identity'
);

insert into public.customers (id, name, booqable_customer_id, entity_origin)
values (
  '00000000-0000-4000-8000-000000000061',
  'Locked Local',
  null,
  'local'
);

select throws_ok(
  $$update public.customers
    set booqable_customer_id = 'cus_merged'
    where id = '00000000-0000-4000-8000-000000000061'$$,
  '23514',
  'new row for relation "customers" violates check constraint "customers_origin_identity_check"',
  'origin CHECK still rejects auto-merge'
);

select * from finish();
rollback;
