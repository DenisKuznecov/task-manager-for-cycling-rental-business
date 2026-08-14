begin;

select plan(45);

select has_enum(
  'public',
  'classification_config_mode',
  'classification_config_mode vocabulary exists'
);

select is(
  (
    select array_agg(e.enumlabel::text order by e.enumsortorder)
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'classification_config_mode'
  ),
  array['review_updated_configuration', 'targeted']::text[],
  'classification_config_mode labels match the contract'
);

select has_enum(
  'public',
  'classification_config_status',
  'classification_config_status vocabulary exists'
);

select is(
  (
    select array_agg(e.enumlabel::text order by e.enumsortorder)
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'classification_config_status'
  ),
  array['active', 'superseded']::text[],
  'classification_config_status labels match the contract'
);

select has_enum(
  'public',
  'classification_setup_category',
  'classification_setup_category vocabulary exists'
);

select is(
  (
    select array_agg(e.enumlabel::text order by e.enumsortorder)
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'classification_setup_category'
  ),
  array['pedals', 'saddle', 'wheelset', 'power-meter', 'computer-mount']::text[],
  'classification_setup_category labels match WORKSHOP_SETUP_CATEGORIES'
);

select has_enum(
  'public',
  'classification_setup_fixture_kind',
  'classification_setup_fixture_kind vocabulary exists'
);

select is(
  (
    select array_agg(e.enumlabel::text order by e.enumsortorder)
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'classification_setup_fixture_kind'
  ),
  array['null', 'unknown', 'changed', 'removed']::text[],
  'classification_setup_fixture_kind labels match the contract'
);

select has_enum(
  'public',
  'classification_allowlist_origin',
  'classification_allowlist_origin vocabulary exists'
);

select is(
  (
    select array_agg(e.enumlabel::text order by e.enumsortorder)
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'classification_allowlist_origin'
  ),
  array['business_approved']::text[],
  'classification_allowlist_origin only admits business-approved keys'
);

select has_function(
  'public',
  'approve_classification_mapping_config',
  array['integer', 'uuid', 'classification_config_mode', 'jsonb', 'jsonb', 'jsonb', 'jsonb'],
  'Approve is a privileged database capability'
);

select has_function(
  'public',
  'rollback_classification_mapping_config',
  array['uuid', 'integer', 'uuid'],
  'Rollback is a privileged database capability'
);

select ok(has_function_privilege(
  'authenticated',
  'public.approve_classification_mapping_config(integer, uuid, classification_config_mode, jsonb, jsonb, jsonb, jsonb)',
  'EXECUTE'
), 'Authenticated users can execute approve');

select ok(not has_function_privilege(
  'anon',
  'public.approve_classification_mapping_config(integer, uuid, classification_config_mode, jsonb, jsonb, jsonb, jsonb)',
  'EXECUTE'
), 'Anonymous users cannot execute approve');

select ok(has_function_privilege(
  'authenticated',
  'public.rollback_classification_mapping_config(uuid, integer, uuid)',
  'EXECUTE'
), 'Authenticated users can execute rollback');

select ok(not has_function_privilege(
  'anon',
  'public.rollback_classification_mapping_config(uuid, integer, uuid)',
  'EXECUTE'
), 'Anonymous users cannot execute rollback');

select ok(not has_table_privilege(
  'authenticated',
  'public.classification_mapping_config_versions',
  'INSERT'
), 'Authenticated users cannot insert versions directly');

select ok(not has_table_privilege(
  'authenticated',
  'public.classification_mapping_config_versions',
  'UPDATE'
), 'Authenticated users cannot update versions directly');

select ok(not has_table_privilege(
  'authenticated',
  'public.classification_mapping_config_versions',
  'DELETE'
), 'Authenticated users cannot delete versions directly');

select ok(not has_table_privilege(
  'authenticated',
  'public.classification_mapping_config_events',
  'INSERT'
), 'Authenticated users cannot insert events directly');

select ok(not has_table_privilege(
  'authenticated',
  'public.classification_mapping_config_events',
  'UPDATE'
), 'Authenticated users cannot update events directly');

select ok(not has_table_privilege(
  'authenticated',
  'public.classification_mapping_config_events',
  'DELETE'
), 'Authenticated users cannot delete events directly');

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data
)
values
  ('00000000-0000-0000-0000-000000000521', 'authenticated', 'authenticated', 'classify-admin@example.com', '', now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000522', 'authenticated', 'authenticated', 'classify-manager@example.com', '', now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000523', 'authenticated', 'authenticated', 'classify-mechanic@example.com', '', now(), '{}', '{}');

update public.profiles
set role = case id
  when '00000000-0000-0000-0000-000000000521'::uuid then 'admin'::public.user_role
  when '00000000-0000-0000-0000-000000000522'::uuid then 'manager'::public.user_role
  else 'mechanic'::public.user_role
end
where id in (
  '00000000-0000-0000-0000-000000000521'::uuid,
  '00000000-0000-0000-0000-000000000522'::uuid,
  '00000000-0000-0000-0000-000000000523'::uuid
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000521',
  true
);

create temp table spec25_source as
select
  '{}'::jsonb as allowlist,
  '[]'::jsonb as display_labels,
  '[
    {"category":"pedals","identifier":null,"fixtures":{"null":null,"unknown":null,"changed":null,"removed":null}},
    {"category":"saddle","identifier":null,"fixtures":{"null":null,"unknown":null,"changed":null,"removed":null}},
    {"category":"wheelset","identifier":null,"fixtures":{"null":null,"unknown":null,"changed":null,"removed":null}},
    {"category":"power-meter","identifier":null,"fixtures":{"null":null,"unknown":null,"changed":null,"removed":null}},
    {"category":"computer-mount","identifier":null,"fixtures":{"null":null,"unknown":null,"changed":null,"removed":null}}
  ]'::jsonb as setup_slots,
  '{"origin":"editable_source","source":"src/lib/booqable/contracts/classification-config.ts"}'::jsonb as provenance;

select lives_ok(
  $$
    select public.approve_classification_mapping_config(
      0,
      null,
      'review_updated_configuration',
      (select allowlist from spec25_source),
      (select display_labels from spec25_source),
      (select setup_slots from spec25_source),
      (select provenance from spec25_source)
    )
  $$,
  'Admins can approve the empty unproven v1 source'
);

create temp table spec25_ctx as
select
  v.id as first_id,
  v.revision as first_revision
from public.classification_mapping_config_versions v
where v.status = 'active';

select results_eq(
  $$
    select v.revision, v.status, v.mode, v.prior_version_id, v.approved_by,
           v.allowlist, v.display_labels
    from public.classification_mapping_config_versions v
    where v.id = (select first_id from spec25_ctx)
  $$,
  $$values (
    1,
    'active'::public.classification_config_status,
    'review_updated_configuration'::public.classification_config_mode,
    null::uuid,
    '00000000-0000-0000-0000-000000000521'::uuid,
    '{}'::jsonb,
    '[]'::jsonb
  )$$,
  'First approve stores revision 1, empty allowlist, display-only labels, and no prior version'
);

select results_eq(
  $$
    select e.event_type, e.actor_id, e.version_id, e.revision, e.prior_version_id, e.mode
    from public.classification_mapping_config_events e
    where e.version_id = (select first_id from spec25_ctx)
  $$,
  $$values (
    'approved',
    '00000000-0000-0000-0000-000000000521'::uuid,
    (select first_id from spec25_ctx),
    1,
    null::uuid,
    'review_updated_configuration'::public.classification_config_mode
  )$$,
  'First approve records one attributed approved event'
);

select is(
  (
    select count(*)::integer
    from public.classification_mapping_config_versions v
    where v.status = 'active'
  ),
  1,
  'First approve leaves exactly one Active version'
);

select lives_ok(
  $$
    select public.approve_classification_mapping_config(
      (select first_revision from spec25_ctx),
      (select first_id from spec25_ctx),
      'review_updated_configuration',
      (select allowlist from spec25_source),
      (select display_labels from spec25_source),
      (select setup_slots from spec25_source),
      (select provenance from spec25_source)
    )
  $$,
  'Admins can supersede the Active snapshot'
);

select results_eq(
  $$
    select v.status, v.prior_version_id, v.revision
    from public.classification_mapping_config_versions v
    where v.status = 'active'
  $$,
  $$values (
    'active'::public.classification_config_status,
    (select first_id from spec25_ctx),
    2
  )$$,
  'Supersede creates a new Active with the prior version recorded'
);

select results_eq(
  $$
    select v.status
    from public.classification_mapping_config_versions v
    where v.id = (select first_id from spec25_ctx)
  $$,
  $$values ('superseded'::public.classification_config_status)$$,
  'Supersede marks the previous Active as superseded'
);

create temp table spec25_second as
select v.id as second_id, v.revision as second_revision
from public.classification_mapping_config_versions v
where v.status = 'active';

select lives_ok(
  $$
    select public.rollback_classification_mapping_config(
      (select first_id from spec25_ctx),
      (select second_revision from spec25_second),
      (select second_id from spec25_second)
    )
  $$,
  'Admins can roll back to the prior snapshot'
);

select results_eq(
  $$
    select v.id, v.status, v.revision
    from public.classification_mapping_config_versions v
    where v.status = 'active'
  $$,
  $$values (
    (select first_id from spec25_ctx),
    'active'::public.classification_config_status,
    1
  )$$,
  'Rollback restores the prior snapshot as Active without editing the source'
);

select results_eq(
  $$
    select v.status
    from public.classification_mapping_config_versions v
    where v.id = (select second_id from spec25_second)
  $$,
  $$values ('superseded'::public.classification_config_status)$$,
  'Rollback supersedes the current Active'
);

select results_eq(
  $$
    select e.event_type, e.actor_id, e.version_id, e.revision, e.prior_version_id
    from public.classification_mapping_config_events e
    where e.event_type = 'rolled_back'
  $$,
  $$values (
    'rolled_back',
    '00000000-0000-0000-0000-000000000521'::uuid,
    (select first_id from spec25_ctx),
    1,
    (select second_id from spec25_second)
  )$$,
  'Rollback writes an attributed audit row'
);

select throws_ok(
  $$
    select public.approve_classification_mapping_config(
      1,
      (select first_id from spec25_ctx),
      'targeted',
      (select allowlist from spec25_source),
      (select display_labels from spec25_source),
      (select setup_slots from spec25_source),
      (select provenance from spec25_source)
    )
  $$,
  '22023',
  'Targeted mode requires proven setup mappings',
  'Targeted mode is rejected while setup slots are unproven'
);

select is(
  (
    select count(*)::integer
    from public.classification_mapping_config_versions v
    where v.status = 'active'
  ),
  1,
  'Rejected targeted approve does not write a new version'
);

select throws_ok(
  $$
    select public.approve_classification_mapping_config(
      99,
      (select first_id from spec25_ctx),
      'review_updated_configuration',
      (select allowlist from spec25_source),
      (select display_labels from spec25_source),
      (select setup_slots from spec25_source),
      (select provenance from spec25_source)
    )
  $$,
  'P0001',
  'Classification mapping configuration is stale',
  'Stale expected_revision is rejected'
);

select throws_ok(
  $$
    select public.approve_classification_mapping_config(
      1,
      '00000000-0000-0000-0000-000000000599',
      'review_updated_configuration',
      (select allowlist from spec25_source),
      (select display_labels from spec25_source),
      (select setup_slots from spec25_source),
      (select provenance from spec25_source)
    )
  $$,
  'P0001',
  'Classification mapping configuration is stale',
  'Stale Active pointer is rejected'
);

select is(
  (
    select count(*)::integer
    from public.classification_mapping_config_versions
  ),
  2,
  'Stale approve leaves existing versions unchanged'
);

reset role;

create function pg_temp.stale_revision_detail_matches()
returns boolean
language plpgsql
as $$
declare
  v_detail text;
begin
  begin
    perform public.approve_classification_mapping_config(
      99,
      (select first_id from spec25_ctx),
      'review_updated_configuration',
      (select allowlist from spec25_source),
      (select display_labels from spec25_source),
      (select setup_slots from spec25_source),
      (select provenance from spec25_source)
    );
  exception
    when sqlstate 'P0001' then
      get stacked diagnostics v_detail = pg_exception_detail;
      return coalesce((v_detail::jsonb ->> 'stale')::boolean, false)
        and (v_detail::jsonb ->> 'revision')::integer = 1
        and (v_detail::jsonb ->> 'activeVersionId') = (select first_id::text from spec25_ctx);
  end;
  return false;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000521',
  true
);

select ok(
  pg_temp.stale_revision_detail_matches(),
  'Stale DETAIL includes stale, revision, and Active identity'
);

select throws_ok(
  $$
    select public.approve_classification_mapping_config(
      1,
      (select first_id from spec25_ctx),
      'review_updated_configuration',
      '{"Road Bike":{"origin":"business_approved","collected_at":"2026-08-14T00:00:00.000Z"}}'::jsonb,
      (select display_labels from spec25_source),
      (select setup_slots from spec25_source),
      (select provenance from spec25_source)
    )
  $$,
  '22023',
  'Allowlist keys must be ProductGroup UUIDs',
  'A label-only allowlist key is rejected'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000522',
  true
);

select throws_ok(
  $$
    select public.approve_classification_mapping_config(
      1,
      (select first_id from spec25_ctx),
      'review_updated_configuration',
      (select allowlist from spec25_source),
      (select display_labels from spec25_source),
      (select setup_slots from spec25_source),
      (select provenance from spec25_source)
    )
  $$,
  '42501',
  'Not authorized to approve classification mapping configuration',
  'Managers cannot approve classification mapping configuration'
);

select is_empty(
  $$select * from public.classification_mapping_config_versions$$,
  'Managers cannot read classification mapping versions'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000523',
  true
);

select throws_ok(
  $$
    select public.rollback_classification_mapping_config(
      (select first_id from spec25_ctx),
      1,
      (select first_id from spec25_ctx)
    )
  $$,
  '42501',
  'Not authorized to roll back classification mapping configuration',
  'Mechanics cannot roll back classification mapping configuration'
);

select is_empty(
  $$select * from public.classification_mapping_config_events$$,
  'Mechanics cannot read classification mapping events'
);

reset role;

select throws_ok(
  $$
    insert into public.classification_mapping_config_versions (
      revision,
      status,
      mode,
      allowlist,
      display_labels,
      setup_slots,
      provenance,
      approved_by
    )
    select
      99,
      'active',
      'review_updated_configuration',
      allowlist,
      display_labels,
      setup_slots,
      provenance,
      '00000000-0000-0000-0000-000000000521'::uuid
    from spec25_source
  $$,
  '23505',
  'duplicate key value violates unique constraint "classification_mapping_config_one_active_idx"',
  'Unique one-Active index remains the last line of defense'
);

select * from finish();
rollback;
