begin;

select plan(6);

select is(
  split_part(current_setting('server_version'), '.', 1),
  '17',
  'Local PostgreSQL is major 17'
);

select ok(
  exists(
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'plpgsql'
      and n.nspname = 'pg_catalog'
  ),
  'plpgsql is present in pg_catalog'
);

select ok(
  exists(
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pgcrypto'
      and n.nspname = 'extensions'
  ),
  'pgcrypto is present in extensions'
);

select ok(
  exists(
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'uuid-ossp'
      and n.nspname = 'extensions'
  ),
  'uuid-ossp is present in extensions'
);

select ok(
  exists(
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'supabase_vault'
      and n.nspname = 'vault'
  ),
  'supabase_vault is present in vault'
);

select ok(
  exists(
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pg_stat_statements'
      and n.nspname = 'extensions'
  ),
  'pg_stat_statements is present in extensions'
);

select * from finish();
rollback;
