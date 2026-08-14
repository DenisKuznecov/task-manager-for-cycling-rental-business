begin;

select plan(14);

select has_enum(
  'public',
  'source_envelope_kind',
  'source_envelope_kind vocabulary exists'
);

select is(
  (
    select array_agg(e.enumlabel::text order by e.enumsortorder)
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'source_envelope_kind'
  ),
  array['order_graph', 'resource_batch']::text[],
  'source_envelope_kind labels match the contract'
);

select has_enum(
  'public',
  'source_relationship_scope',
  'source_relationship_scope vocabulary exists'
);

select is(
  (
    select array_agg(e.enumlabel::text order by e.enumsortorder)
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'source_relationship_scope'
  ),
  array['complete', 'partial']::text[],
  'source_relationship_scope labels match the contract'
);

select has_enum(
  'public',
  'source_resource_presence',
  'source_resource_presence vocabulary exists'
);

select is(
  (
    select array_agg(e.enumlabel::text order by e.enumsortorder)
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'source_resource_presence'
  ),
  array['known', 'unknown', 'removed']::text[],
  'source_resource_presence labels match the contract'
);

select has_enum(
  'public',
  'source_apply_result',
  'source_apply_result vocabulary exists'
);

select is(
  (
    select array_agg(e.enumlabel::text order by e.enumsortorder)
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'source_apply_result'
  ),
  array[
    'applied',
    'no_op',
    'derivation_disabled',
    'quarantined',
    'rejected_retryable',
    'rejected_terminal'
  ]::text[],
  'source_apply_result labels match the six-value vocabulary'
);

select has_type(
  'public',
  'source_canonical_identity',
  'canonical identity composite exists'
);

select is(
  (
    select array_agg(a.attname::text order by a.attnum)
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    join pg_attribute a on a.attrelid = t.typrelid
    where n.nspname = 'public'
      and t.typname = 'source_canonical_identity'
      and a.attnum > 0
      and not a.attisdropped
  ),
  array['resource_type', 'external_id']::text[],
  'canonical identity attributes match the contract'
);

select throws_ok(
  $$select 'catalog_snapshot'::public.source_envelope_kind$$,
  '22P02',
  'invalid input value for enum source_envelope_kind: "catalog_snapshot"',
  'unknown source_envelope_kind label is rejected'
);

select throws_ok(
  $$select 'full'::public.source_relationship_scope$$,
  '22P02',
  'invalid input value for enum source_relationship_scope: "full"',
  'unknown source_relationship_scope label is rejected'
);

select throws_ok(
  $$select 'deleted'::public.source_resource_presence$$,
  '22P02',
  'invalid input value for enum source_resource_presence: "deleted"',
  'unknown source_resource_presence label is rejected'
);

select throws_ok(
  $$select 'newer_unknown_code'::public.source_apply_result$$,
  '22P02',
  'invalid input value for enum source_apply_result: "newer_unknown_code"',
  'unknown source_apply_result label is rejected'
);

select * from finish();
rollback;
