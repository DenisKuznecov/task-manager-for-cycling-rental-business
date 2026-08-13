begin;

select plan(44);

select has_column(
  'public',
  'workshop_checklist_events',
  'superseded_version_id',
  'Activated events can point at the prior Active version'
);
select has_function(
  'public',
  'activate_checklist_version',
  array['uuid', 'integer', 'uuid'],
  'Activation is a privileged database capability'
);
select ok(has_function_privilege(
  'authenticated',
  'public.activate_checklist_version(uuid, integer, uuid)',
  'EXECUTE'
), 'Authenticated users can execute activation');
select ok(not has_function_privilege(
  'anon',
  'public.activate_checklist_version(uuid, integer, uuid)',
  'EXECUTE'
), 'Anonymous users cannot execute activation');
select ok(not has_table_privilege(
  'authenticated',
  'public.workshop_checklist_versions',
  'UPDATE'
), 'Authenticated users cannot update versions directly');
select ok(not has_table_privilege(
  'authenticated',
  'public.workshop_checklist_versions',
  'DELETE'
), 'Authenticated users cannot delete versions directly');
select ok(not has_table_privilege(
  'authenticated',
  'public.workshop_checklist_items',
  'INSERT'
), 'Authenticated users cannot insert items directly');
select ok(not has_table_privilege(
  'authenticated',
  'public.workshop_checklist_items',
  'UPDATE'
), 'Authenticated users cannot update items directly');
select ok(not has_table_privilege(
  'authenticated',
  'public.workshop_checklist_events',
  'INSERT'
), 'Authenticated users cannot insert events directly');
select ok(not has_table_privilege(
  'authenticated',
  'public.workshop_checklist_events',
  'UPDATE'
), 'Authenticated users cannot update events directly');

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
  ('00000000-0000-0000-0000-000000000411', 'authenticated', 'authenticated', 'activate-admin@example.com', '', now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000412', 'authenticated', 'authenticated', 'activate-manager@example.com', '', now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000413', 'authenticated', 'authenticated', 'activate-mechanic@example.com', '', now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000414', 'authenticated', 'authenticated', 'activate-partner@example.com', '', now(), '{}', '{}');

update public.profiles
set role = case id
  when '00000000-0000-0000-0000-000000000411'::uuid then 'admin'::public.user_role
  when '00000000-0000-0000-0000-000000000412'::uuid then 'manager'::public.user_role
  when '00000000-0000-0000-0000-000000000413'::uuid then 'mechanic'::public.user_role
  else 'partner'::public.user_role
end
where id in (
  '00000000-0000-0000-0000-000000000411'::uuid,
  '00000000-0000-0000-0000-000000000412'::uuid,
  '00000000-0000-0000-0000-000000000413'::uuid,
  '00000000-0000-0000-0000-000000000414'::uuid
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000411',
  true
);

create temp table spec14_ctx as
select
  public.create_draft_checklist_version('prep', 'road') as empty_draft_id,
  public.create_draft_checklist_version('return', 'mtb') as first_active_id,
  public.create_draft_checklist_version('return', 'mtb') as replace_draft_id,
  public.create_draft_checklist_version('prep', 'gravel') as invalid_draft_id,
  public.create_draft_checklist_version('return', 'e-city') as stale_draft_id,
  public.create_draft_checklist_version('prep', 'e-road') as coverage_draft_id;

select lives_ok(
  $$
    select public.activate_checklist_version(
      (select empty_draft_id from spec14_ctx),
      1,
      null
    )
  $$,
  'Admins can activate an empty structurally valid Draft'
);

select results_eq(
  $$
    select v.status, v.revision
    from public.workshop_checklist_versions v
    where v.id = (select empty_draft_id from spec14_ctx)
  $$,
  $$values ('active', 2)$$,
  'First activate moves Draft to Active and bumps revision'
);

select results_eq(
  $$
    select e.event_type, e.actor_id, e.phase, e.bike_category,
           e.version_id, e.revision, e.superseded_version_id
    from public.workshop_checklist_events e
    where e.version_id = (select empty_draft_id from spec14_ctx)
      and e.event_type = 'activated'
  $$,
  $$values (
    'activated',
    '00000000-0000-0000-0000-000000000411'::uuid,
    'prep',
    'road',
    (select empty_draft_id from spec14_ctx),
    2,
    null::uuid
  )$$,
  'First activate records one attributed activated event without a superseded version'
);

select is(
  (
    select count(*)::integer
    from public.workshop_checklist_versions v
    join public.workshop_checklist_templates t on t.id = v.template_id
    where t.phase = 'prep' and t.bike_category = 'road' and v.status = 'active'
  ),
  1,
  'First activate leaves exactly one Active version for the pairing'
);

select lives_ok(
  $$
    select public.add_draft_checklist_item(
      (select first_active_id from spec14_ctx),
      1,
      'Return bars',
      'action',
      true,
      true,
      false,
      'saddle'
    )
  $$,
  'Admins can add an item to the version that will become Active'
);

select lives_ok(
  $$
    select public.activate_checklist_version(
      (select first_active_id from spec14_ctx),
      2,
      null
    )
  $$,
  'Admins can activate a Draft that has items'
);

select lives_ok(
  $$
    select public.add_draft_checklist_item(
      (select replace_draft_id from spec14_ctx),
      1,
      'Return wheels',
      'value',
      false,
      true,
      true,
      null
    )
  $$,
  'Admins can add an item to the replacement Draft'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000412',
  true
);

select lives_ok(
  $$
    select public.activate_checklist_version(
      (select replace_draft_id from spec14_ctx),
      2,
      (select first_active_id from spec14_ctx)
    )
  $$,
  'Managers can replace the current Active version'
);

select results_eq(
  $$
    select v.status, v.revision
    from public.workshop_checklist_versions v
    where v.id = (select replace_draft_id from spec14_ctx)
  $$,
  $$values ('active', 3)$$,
  'Replacement Draft becomes Active and bumps revision'
);

select results_eq(
  $$
    select v.status
    from public.workshop_checklist_versions v
    where v.id = (select first_active_id from spec14_ctx)
  $$,
  $$values ('superseded')$$,
  'Prior Active is superseded atomically'
);

select is(
  (
    select count(*)::integer
    from public.workshop_checklist_versions v
    join public.workshop_checklist_templates t on t.id = v.template_id
    where t.phase = 'return' and t.bike_category = 'mtb' and v.status = 'active'
  ),
  1,
  'Replace Active leaves exactly one Active version for the pairing'
);

select results_eq(
  $$
    select item.label, item.position, item.item_type, item.setup_category
    from public.workshop_checklist_items item
    where item.version_id in (
      (select first_active_id from spec14_ctx),
      (select replace_draft_id from spec14_ctx)
    )
    order by item.label
  $$,
  $$
    values
      ('Return bars', 1, 'action', 'saddle'),
      ('Return wheels', 1, 'value', null)
  $$,
  'Activation does not mutate Items on the new Active or superseded version'
);

select results_eq(
  $$
    select e.actor_id, e.superseded_version_id, e.revision
    from public.workshop_checklist_events e
    where e.version_id = (select replace_draft_id from spec14_ctx)
      and e.event_type = 'activated'
  $$,
  $$values (
    '00000000-0000-0000-0000-000000000412'::uuid,
    (select first_active_id from spec14_ctx),
    3
  )$$,
  'Replacement records one activated event that points at the superseded version'
);

select is(
  (
    select count(*)::integer
    from public.workshop_checklist_events e
    where e.version_id = (select replace_draft_id from spec14_ctx)
      and e.event_type = 'activated'
  ),
  1,
  'Replacement writes exactly one activated event'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000411',
  true
);

select lives_ok(
  $$
    select public.add_draft_checklist_item(
      (select coverage_draft_id from spec14_ctx),
      1,
      'Only pedals',
      'action',
      false,
      true,
      false,
      'pedals'
    )
  $$,
  'Admins can add a coverage-incomplete Draft item'
);

select lives_ok(
  $$
    select public.activate_checklist_version(
      (select coverage_draft_id from spec14_ctx),
      2,
      null
    )
  $$,
  'Missing Setup Category coverage does not block activation'
);

reset role;

alter table public.workshop_checklist_items
  drop constraint if exists workshop_checklist_items_m2_implies_m1;

insert into public.workshop_checklist_items (
  version_id,
  label,
  position,
  item_type,
  required,
  m1,
  m2,
  setup_category
)
select
  invalid_draft_id,
  'Invalid M2',
  1,
  'action',
  false,
  false,
  true,
  null
from spec14_ctx;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000411',
  true
);

select throws_ok(
  $$
    select public.activate_checklist_version(
      (select invalid_draft_id from spec14_ctx),
      1,
      null
    )
  $$,
  '22023',
  'M2 requires M1',
  'Invalid Item structure is rejected'
);

select results_eq(
  $$
    select v.status, v.revision
    from public.workshop_checklist_versions v
    where v.id = (select invalid_draft_id from spec14_ctx)
  $$,
  $$values ('draft', 1)$$,
  'Invalid structure leaves status and revision unchanged'
);

select is(
  (
    select count(*)::integer
    from public.workshop_checklist_events e
    where e.version_id = (select invalid_draft_id from spec14_ctx)
      and e.event_type = 'activated'
  ),
  0,
  'Invalid structure does not record an activated event'
);

select lives_ok(
  $$
    select public.add_draft_checklist_item(
      (select stale_draft_id from spec14_ctx),
      1,
      'Stale target',
      'action',
      false,
      true,
      false,
      null
    )
  $$,
  'Admins can add an item used for stale activation tests'
);

select throws_ok(
  $$
    select public.activate_checklist_version(
      (select stale_draft_id from spec14_ctx),
      1,
      null
    )
  $$,
  'P0001',
  'Checklist version is stale',
  'Stale expected_revision is rejected'
);

select results_eq(
  $$
    select v.status, v.revision
    from public.workshop_checklist_versions v
    where v.id = (select stale_draft_id from spec14_ctx)
  $$,
  $$values ('draft', 2)$$,
  'Stale revision leaves pointers unchanged'
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
    perform public.activate_checklist_version(
      (select stale_draft_id from spec14_ctx),
      1,
      null
    );
  exception
    when sqlstate 'P0001' then
      get stacked diagnostics v_detail = pg_exception_detail;
      return coalesce((v_detail::jsonb ->> 'stale')::boolean, false)
        and (v_detail::jsonb ->> 'revision')::integer = 2
        and v_detail::jsonb ->> 'status' = 'draft'
        and v_detail::jsonb ->> 'activeVersionId' is null;
  end;
  return false;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000411',
  true
);

select ok(
  pg_temp.stale_revision_detail_matches(),
  'Stale revision DETAIL includes stale, revision, status, and Active identity'
);

select throws_ok(
  $$
    select public.activate_checklist_version(
      (select stale_draft_id from spec14_ctx),
      2,
      '00000000-0000-0000-0000-000000000499'
    )
  $$,
  'P0001',
  'Checklist version is stale',
  'Stale expected_active_version_id is rejected'
);

select results_eq(
  $$
    select v.status, v.revision
    from public.workshop_checklist_versions v
    where v.id = (select stale_draft_id from spec14_ctx)
  $$,
  $$values ('draft', 2)$$,
  'Stale Active pointer leaves the Draft unchanged'
);

select throws_ok(
  $$
    select public.activate_checklist_version(
      (select empty_draft_id from spec14_ctx),
      2,
      null
    )
  $$,
  '55000',
  'Checklist version is not a draft',
  'RPC denies activation of an already Active version'
);

select throws_ok(
  $$
    select public.activate_checklist_version(
      (select first_active_id from spec14_ctx),
      (
        select revision
        from public.workshop_checklist_versions
        where id = (select first_active_id from spec14_ctx)
      ),
      (select replace_draft_id from spec14_ctx)
    )
  $$,
  '55000',
  'Checklist version is not a draft',
  'RPC denies activation of a Superseded version'
);

select lives_ok(
  $$select public.create_draft_checklist_version('return', 'mtb')$$,
  'A later Draft can be created beside the replaced Active'
);

select throws_ok(
  $$
    select public.activate_checklist_version(
      (
        select v.id
        from public.workshop_checklist_versions v
        join public.workshop_checklist_templates t on t.id = v.template_id
        where t.phase = 'return'
          and t.bike_category = 'mtb'
          and v.status = 'draft'
        order by v.version_number desc
        limit 1
      ),
      1,
      (select first_active_id from spec14_ctx)
    )
  $$,
  'P0001',
  'Checklist version is stale',
  'Concurrent activate against a superseded Active pointer is stale'
);

select is(
  (
    select count(*)::integer
    from public.workshop_checklist_versions v
    join public.workshop_checklist_templates t on t.id = v.template_id
    where t.phase = 'return' and t.bike_category = 'mtb' and v.status = 'active'
  ),
  1,
  'Concurrent stale activate still leaves exactly one Active version'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000413',
  true
);
select throws_ok(
  $$
    select public.activate_checklist_version(
      (select stale_draft_id from spec14_ctx),
      2,
      null
    )
  $$,
  '42501',
  'Not authorized to activate a checklist version',
  'Mechanics cannot activate drafts'
);

select is_empty(
  $$select * from public.workshop_checklist_versions$$,
  'Mechanics cannot read checklist versions'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000414',
  true
);
select throws_ok(
  $$
    select public.activate_checklist_version(
      (select stale_draft_id from spec14_ctx),
      2,
      null
    )
  $$,
  '42501',
  'Not authorized to activate a checklist version',
  'Partners cannot activate drafts'
);

reset role;

select throws_ok(
  $$
    insert into public.workshop_checklist_versions (
      template_id,
      version_number,
      status
    )
    select v.template_id, 99, 'active'
    from public.workshop_checklist_versions v
    where v.id = (select empty_draft_id from spec14_ctx)
  $$,
  '23505',
  'duplicate key value violates unique constraint "workshop_checklist_versions_one_active_per_template_idx"',
  'Unique one-Active-per-template index remains the last line of defense'
);

select * from finish();
rollback;
