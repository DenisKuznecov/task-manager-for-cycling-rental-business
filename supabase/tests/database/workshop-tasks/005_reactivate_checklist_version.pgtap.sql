begin;

select plan(43);

select has_function(
  'public',
  'reactivate_checklist_version',
  array['uuid', 'integer', 'uuid'],
  'Reactivation is a privileged database capability'
);
select ok(has_function_privilege(
  'authenticated',
  'public.reactivate_checklist_version(uuid, integer, uuid)',
  'EXECUTE'
), 'Authenticated users can execute reactivation');
select ok(not has_function_privilege(
  'anon',
  'public.reactivate_checklist_version(uuid, integer, uuid)',
  'EXECUTE'
), 'Anonymous users cannot execute reactivation');
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
  ('00000000-0000-0000-0000-000000000511', 'authenticated', 'authenticated', 'reactivate-admin@example.com', '', now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000512', 'authenticated', 'authenticated', 'reactivate-manager@example.com', '', now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000513', 'authenticated', 'authenticated', 'reactivate-mechanic@example.com', '', now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000514', 'authenticated', 'authenticated', 'reactivate-partner@example.com', '', now(), '{}', '{}');

update public.profiles
set role = case id
  when '00000000-0000-0000-0000-000000000511'::uuid then 'admin'::public.user_role
  when '00000000-0000-0000-0000-000000000512'::uuid then 'manager'::public.user_role
  when '00000000-0000-0000-0000-000000000513'::uuid then 'mechanic'::public.user_role
  else 'partner'::public.user_role
end
where id in (
  '00000000-0000-0000-0000-000000000511'::uuid,
  '00000000-0000-0000-0000-000000000512'::uuid,
  '00000000-0000-0000-0000-000000000513'::uuid,
  '00000000-0000-0000-0000-000000000514'::uuid
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000511',
  true
);

create temp table spec15_ctx as
select
  public.create_draft_checklist_version('return', 'mtb') as superseded_id,
  public.create_draft_checklist_version('return', 'mtb') as current_active_id,
  public.create_draft_checklist_version('prep', 'road') as draft_id,
  public.create_draft_checklist_version('return', 'e-city') as stale_superseded_id,
  public.create_draft_checklist_version('return', 'e-city') as stale_active_id,
  public.create_draft_checklist_version('prep', 'gravel') as concurrent_superseded_id,
  public.create_draft_checklist_version('prep', 'gravel') as concurrent_active_id,
  public.create_draft_checklist_version('prep', 'e-road') as unique_active_id;

select lives_ok(
  $$
    select public.add_draft_checklist_item(
      (select superseded_id from spec15_ctx),
      1,
      'Return bars',
      'action',
      true,
      true,
      false,
      'saddle'
    )
  $$,
  'Admins can add an item to the version that will be reactivated'
);

select lives_ok(
  $$
    select public.activate_checklist_version(
      (select superseded_id from spec15_ctx),
      2,
      null
    )
  $$,
  'Admins can activate the first return/mtb version'
);

select lives_ok(
  $$
    select public.add_draft_checklist_item(
      (select current_active_id from spec15_ctx),
      1,
      'Return wheels',
      'value',
      false,
      true,
      true,
      null
    )
  $$,
  'Admins can add an item to the current Active version'
);

select lives_ok(
  $$
    select public.activate_checklist_version(
      (select current_active_id from spec15_ctx),
      2,
      (select superseded_id from spec15_ctx)
    )
  $$,
  'Admins can replace the first Active so a Superseded version exists'
);

select lives_ok(
  $$
    select public.activate_checklist_version(
      (select stale_superseded_id from spec15_ctx),
      1,
      null
    )
  $$,
  'Admins can activate the stale-test first version'
);

select lives_ok(
  $$
    select public.activate_checklist_version(
      (select stale_active_id from spec15_ctx),
      1,
      (select stale_superseded_id from spec15_ctx)
    )
  $$,
  'Admins can activate the stale-test replacement'
);

select lives_ok(
  $$
    select public.activate_checklist_version(
      (select concurrent_superseded_id from spec15_ctx),
      1,
      null
    )
  $$,
  'Admins can activate the concurrent-test first version'
);

select lives_ok(
  $$
    select public.activate_checklist_version(
      (select concurrent_active_id from spec15_ctx),
      1,
      (select concurrent_superseded_id from spec15_ctx)
    )
  $$,
  'Admins can activate the concurrent-test replacement'
);

select lives_ok(
  $$
    select public.activate_checklist_version(
      (select unique_active_id from spec15_ctx),
      1,
      null
    )
  $$,
  'Admins can activate the unique-index fixture'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000512',
  true
);

select lives_ok(
  $$
    select public.reactivate_checklist_version(
      (select superseded_id from spec15_ctx),
      (
        select revision
        from public.workshop_checklist_versions
        where id = (select superseded_id from spec15_ctx)
      ),
      (select current_active_id from spec15_ctx)
    )
  $$,
  'Managers can reactivate a Superseded version'
);

select results_eq(
  $$
    select v.status, v.revision
    from public.workshop_checklist_versions v
    where v.id = (select superseded_id from spec15_ctx)
  $$,
  $$values ('active', 5)$$,
  'Reactivated version becomes Active and bumps revision'
);

select results_eq(
  $$
    select v.status
    from public.workshop_checklist_versions v
    where v.id = (select current_active_id from spec15_ctx)
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
  'Reactivate leaves exactly one Active version for the pairing'
);

select results_eq(
  $$
    select item.label, item.position, item.item_type, item.setup_category
    from public.workshop_checklist_items item
    where item.version_id in (
      (select superseded_id from spec15_ctx),
      (select current_active_id from spec15_ctx)
    )
    order by item.label
  $$,
  $$
    values
      ('Return bars', 1, 'action', 'saddle'),
      ('Return wheels', 1, 'value', null)
  $$,
  'Reactivation does not mutate Items on either version'
);

select results_eq(
  $$
    select e.event_type, e.actor_id, e.phase, e.bike_category,
           e.version_id, e.revision, e.superseded_version_id
    from public.workshop_checklist_events e
    where e.version_id = (select superseded_id from spec15_ctx)
      and e.event_type = 'reactivated'
  $$,
  $$values (
    'reactivated',
    '00000000-0000-0000-0000-000000000512'::uuid,
    'return',
    'mtb',
    (select superseded_id from spec15_ctx),
    5,
    (select current_active_id from spec15_ctx)
  )$$,
  'Reactivate records one attributed reactivated event pointing at the superseded version'
);

select is(
  (
    select count(*)::integer
    from public.workshop_checklist_events e
    where e.version_id = (select superseded_id from spec15_ctx)
      and e.event_type = 'reactivated'
  ),
  1,
  'Reactivate writes exactly one reactivated event'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000511',
  true
);

select throws_ok(
  $$
    select public.reactivate_checklist_version(
      (select stale_superseded_id from spec15_ctx),
      1,
      (select stale_active_id from spec15_ctx)
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
    where v.id = (select stale_superseded_id from spec15_ctx)
  $$,
  $$values ('superseded', 3)$$,
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
    perform public.reactivate_checklist_version(
      (select stale_superseded_id from spec15_ctx),
      1,
      (select stale_active_id from spec15_ctx)
    );
  exception
    when sqlstate 'P0001' then
      get stacked diagnostics v_detail = pg_exception_detail;
      return coalesce((v_detail::jsonb ->> 'stale')::boolean, false)
        and (v_detail::jsonb ->> 'revision')::integer = 3
        and v_detail::jsonb ->> 'status' = 'superseded'
        and (v_detail::jsonb ->> 'activeVersionId')::uuid
          = (select stale_active_id from spec15_ctx)
        and (v_detail::jsonb ->> 'activeVersionNumber')::integer = 2;
  end;
  return false;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000511',
  true
);

select ok(
  pg_temp.stale_revision_detail_matches(),
  'Stale revision DETAIL includes stale, revision, status, and Active identity'
);

select throws_ok(
  $$
    select public.reactivate_checklist_version(
      (select stale_superseded_id from spec15_ctx),
      3,
      '00000000-0000-0000-0000-000000000599'
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
    where v.id = (select stale_superseded_id from spec15_ctx)
  $$,
  $$values ('superseded', 3)$$,
  'Stale Active pointer leaves the Superseded version unchanged'
);

select throws_ok(
  $$
    select public.reactivate_checklist_version(
      (select draft_id from spec15_ctx),
      1,
      (select unique_active_id from spec15_ctx)
    )
  $$,
  '55000',
  'Checklist version is not superseded',
  'RPC denies reactivation of a Draft'
);

select throws_ok(
  $$
    select public.reactivate_checklist_version(
      (select unique_active_id from spec15_ctx),
      2,
      (select unique_active_id from spec15_ctx)
    )
  $$,
  '55000',
  'Checklist version is not superseded',
  'RPC denies reactivation of an already Active version'
);

select throws_ok(
  $$
    select public.reactivate_checklist_version(
      '00000000-0000-0000-0000-000000000598',
      1,
      (select unique_active_id from spec15_ctx)
    )
  $$,
  'P0002',
  'Checklist version not found',
  'RPC denies reactivation of a missing version'
);

select lives_ok(
  $$select public.create_draft_checklist_version('prep', 'gravel')$$,
  'A later Draft can be created beside the concurrent-test Active'
);

select lives_ok(
  $$
    select public.activate_checklist_version(
      (
        select v.id
        from public.workshop_checklist_versions v
        join public.workshop_checklist_templates t on t.id = v.template_id
        where t.phase = 'prep'
          and t.bike_category = 'gravel'
          and v.status = 'draft'
        order by v.version_number desc
        limit 1
      ),
      1,
      (select concurrent_active_id from spec15_ctx)
    )
  $$,
  'Concurrent activate against the current Active commits first'
);

select throws_ok(
  $$
    select public.reactivate_checklist_version(
      (select concurrent_superseded_id from spec15_ctx),
      (
        select revision
        from public.workshop_checklist_versions
        where id = (select concurrent_superseded_id from spec15_ctx)
      ),
      (select concurrent_active_id from spec15_ctx)
    )
  $$,
  'P0001',
  'Checklist version is stale',
  'Concurrent reactivate against a superseded Active pointer is stale'
);

select is(
  (
    select count(*)::integer
    from public.workshop_checklist_versions v
    join public.workshop_checklist_templates t on t.id = v.template_id
    where t.phase = 'prep' and t.bike_category = 'gravel' and v.status = 'active'
  ),
  1,
  'Concurrent activate then stale reactivate still leaves exactly one Active version'
);

select lives_ok(
  $$select public.create_draft_checklist_version('return', 'mtb')$$,
  'A later Draft can be created beside the reactivated Active'
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
      (select current_active_id from spec15_ctx)
    )
  $$,
  'P0001',
  'Checklist version is stale',
  'Concurrent activate against a superseded Active pointer is stale'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000513',
  true
);
select throws_ok(
  $$
    select public.reactivate_checklist_version(
      (select stale_superseded_id from spec15_ctx),
      3,
      (select stale_active_id from spec15_ctx)
    )
  $$,
  '42501',
  'Not authorized to reactivate a checklist version',
  'Mechanics cannot reactivate superseded versions'
);

select is_empty(
  $$select * from public.workshop_checklist_versions$$,
  'Mechanics cannot read checklist versions'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000514',
  true
);
select throws_ok(
  $$
    select public.reactivate_checklist_version(
      (select stale_superseded_id from spec15_ctx),
      3,
      (select stale_active_id from spec15_ctx)
    )
  $$,
  '42501',
  'Not authorized to reactivate a checklist version',
  'Partners cannot reactivate superseded versions'
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
    where v.id = (select unique_active_id from spec15_ctx)
  $$,
  '23505',
  'duplicate key value violates unique constraint "workshop_checklist_versions_one_active_per_template_idx"',
  'Unique one-Active-per-template index remains the last line of defense'
);

select * from finish();
rollback;
