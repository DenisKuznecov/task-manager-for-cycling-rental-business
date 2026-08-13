begin;

select plan(50);

select has_table(
  'public',
  'workshop_checklist_items',
  'Checklist items are persisted'
);
select has_column(
  'public',
  'workshop_checklist_events',
  'item_id',
  'Events can attribute an item without an item FK'
);
select has_function(
  'public',
  'add_draft_checklist_item',
  array['uuid', 'integer', 'text', 'text', 'boolean', 'boolean', 'boolean', 'text'],
  'Draft item add is a privileged database capability'
);
select has_function(
  'public',
  'update_draft_checklist_item',
  array['uuid', 'integer', 'text', 'text', 'boolean', 'boolean', 'boolean', 'text'],
  'Draft item update is a privileged database capability'
);
select has_function(
  'public',
  'remove_draft_checklist_item',
  array['uuid', 'integer'],
  'Draft item remove is a privileged database capability'
);
select has_function(
  'public',
  'reorder_draft_checklist_items',
  array['uuid', 'integer', 'uuid[]'],
  'Draft item reorder is a privileged database capability'
);

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
  'public.workshop_checklist_items',
  'DELETE'
), 'Authenticated users cannot delete items directly');
select ok(not has_table_privilege(
  'authenticated',
  'public.workshop_checklist_events',
  'INSERT'
), 'Authenticated users cannot insert events directly');
select ok(not has_table_privilege(
  'authenticated',
  'public.workshop_checklist_versions',
  'UPDATE'
), 'Authenticated users cannot update versions directly');
select ok(not has_function_privilege(
  'anon',
  'public.add_draft_checklist_item(uuid, integer, text, text, boolean, boolean, boolean, text)',
  'EXECUTE'
), 'Anonymous users cannot execute item add');
select ok(not has_function_privilege(
  'authenticated',
  'public.prepare_draft_checklist_item_mutation(uuid, integer)',
  'EXECUTE'
), 'Authenticated users cannot execute the internal mutation helper');
select ok(has_function_privilege(
  'authenticated',
  'public.add_draft_checklist_item(uuid, integer, text, text, boolean, boolean, boolean, text)',
  'EXECUTE'
), 'Authenticated users can execute item add');

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
  ('00000000-0000-0000-0000-000000000311', 'authenticated', 'authenticated', 'items-admin@example.com', '', now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000312', 'authenticated', 'authenticated', 'items-manager@example.com', '', now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000313', 'authenticated', 'authenticated', 'items-mechanic@example.com', '', now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000314', 'authenticated', 'authenticated', 'items-partner@example.com', '', now(), '{}', '{}');

update public.profiles
set role = case id
  when '00000000-0000-0000-0000-000000000311'::uuid then 'admin'::public.user_role
  when '00000000-0000-0000-0000-000000000312'::uuid then 'manager'::public.user_role
  when '00000000-0000-0000-0000-000000000313'::uuid then 'mechanic'::public.user_role
  else 'partner'::public.user_role
end
where id in (
  '00000000-0000-0000-0000-000000000311'::uuid,
  '00000000-0000-0000-0000-000000000312'::uuid,
  '00000000-0000-0000-0000-000000000313'::uuid,
  '00000000-0000-0000-0000-000000000314'::uuid
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000311',
  true
);

create temp table spec13_ctx as
select
  public.create_draft_checklist_version('return', 'e-city') as draft_id,
  public.create_draft_checklist_version('prep', 'e-road') as active_id,
  public.create_draft_checklist_version('return', 'gravel') as superseded_id;

alter table spec13_ctx add column sibling_item_id uuid;

reset role;

update public.workshop_checklist_versions as version
set status = 'active'
from spec13_ctx as ctx
where version.id = ctx.active_id
  and not exists (
    select 1
    from public.workshop_checklist_versions as existing
    where existing.template_id = version.template_id
      and existing.status = 'active'
  );

update spec13_ctx as ctx
set active_id = existing.id
from public.workshop_checklist_versions as existing
where existing.status = 'active'
  and not exists (
    select 1
    from public.workshop_checklist_versions as version
    where version.id = ctx.active_id
      and version.status = 'active'
  );

update public.workshop_checklist_versions as version
set status = 'superseded'
from spec13_ctx as ctx
where version.id = ctx.superseded_id;

with inserted as (
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
    ctx.active_id,
    'Active only item',
    coalesce(
      (
        select max(item.position)
        from public.workshop_checklist_items as item
        where item.version_id = ctx.active_id
      ),
      0
    ) + 1,
    'action',
    true,
    true,
    false,
    'pedals'
  from spec13_ctx as ctx
  returning id
)
update spec13_ctx
set sibling_item_id = (select id from inserted);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000311',
  true
);

select is(
  (
    select count(*)::integer
    from public.workshop_checklist_items
    where version_id = (select draft_id from spec13_ctx)
  ),
  0,
  'A draft with zero items is a valid empty definition'
);

select lives_ok(
  $$
    select public.add_draft_checklist_item(
      (select draft_id from spec13_ctx),
      1,
      'Check tire pressure',
      'action',
      true,
      true,
      false,
      null
    )
  $$,
  'Admins can add a draft item without a setup category'
);

select results_eq(
  $$
    select label, position, item_type, required, m1, m2, setup_category
    from public.workshop_checklist_items
    where version_id = (select draft_id from spec13_ctx)
    order by position
  $$,
  $$values (
    'Check tire pressure',
    1,
    'action',
    true,
    true,
    false,
    null::text
  )$$,
  'Added items persist fields and append at the next position'
);

select results_eq(
  $$
    select v.revision, e.event_type, e.actor_id, e.item_id is not null
    from public.workshop_checklist_versions v
    join public.workshop_checklist_events e on e.version_id = v.id
    where v.id = (select draft_id from spec13_ctx)
      and e.event_type = 'item_added'
  $$,
  $$values (2, 'item_added', '00000000-0000-0000-0000-000000000311'::uuid, true)$$,
  'Add increments revision and records an attributed item_added event'
);

select throws_ok(
  $$
    select public.add_draft_checklist_item(
      (select draft_id from spec13_ctx),
      2,
      'M2 without M1',
      'action',
      false,
      false,
      true,
      null
    )
  $$,
  '22023',
  'M2 requires M1',
  'RPC rejects M2 without M1'
);

select is(
  (
    select revision
    from public.workshop_checklist_versions
    where id = (select draft_id from spec13_ctx)
  ),
  2,
  'M2 without M1 does not change revision'
);

select is(
  (
    select count(*)::integer
    from public.workshop_checklist_events
    where version_id = (select draft_id from spec13_ctx)
      and event_type = 'item_added'
  ),
  1,
  'M2 without M1 does not write an event'
);

select throws_ok(
  $$
    select public.add_draft_checklist_item(
      (select draft_id from spec13_ctx),
      2,
      '',
      'action',
      true,
      true,
      false,
      null
    )
  $$,
  '22023',
  'Label is required',
  'RPC rejects an empty label'
);

select throws_ok(
  $$
    select public.add_draft_checklist_item(
      (select draft_id from spec13_ctx),
      2,
      '   ',
      'action',
      true,
      true,
      false,
      null
    )
  $$,
  '22023',
  'Label is required',
  'RPC rejects a whitespace-only label'
);

select is(
  (
    select count(*)::integer
    from public.workshop_checklist_items
    where version_id = (select draft_id from spec13_ctx)
  ),
  1,
  'Empty or whitespace labels do not persist an item'
);

select lives_ok(
  $$
    select public.add_draft_checklist_item(
      (select draft_id from spec13_ctx),
      2,
      'Record torque',
      'value',
      false,
      true,
      true,
      'saddle'
    )
  $$,
  'Admins can add a second item including optional setup category'
);

select throws_ok(
  $$
    select public.add_draft_checklist_item(
      (select draft_id from spec13_ctx),
      2,
      'Stale add',
      'action',
      false,
      true,
      false,
      null
    )
  $$,
  'P0001',
  'Checklist version is stale',
  'Stale expected_revision is rejected'
);

select is(
  (
    select count(*)::integer
    from public.workshop_checklist_items
    where version_id = (select draft_id from spec13_ctx)
  ),
  2,
  'Stale add does not persist an item'
);

reset role;

create function pg_temp.stale_exception_detail_matches()
returns boolean
language plpgsql
as $$
declare
  v_detail text;
begin
  begin
    perform public.add_draft_checklist_item(
      (select draft_id from spec13_ctx),
      2,
      'Stale detail',
      'action',
      false,
      true,
      false,
      null
    );
  exception
    when sqlstate 'P0001' then
      get stacked diagnostics v_detail = pg_exception_detail;
      return coalesce((v_detail::jsonb ->> 'stale')::boolean, false)
        and (v_detail::jsonb ->> 'revision')::integer = 3
        and v_detail::jsonb ->> 'status' = 'draft';
  end;
  return false;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000311',
  true
);

select ok(
  pg_temp.stale_exception_detail_matches(),
  'Stale exception DETAIL includes stale, revision, and status'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000312',
  true
);

select lives_ok(
  $$
    select public.update_draft_checklist_item(
      (select id from public.workshop_checklist_items
       where version_id = (select draft_id from spec13_ctx)
         and position = 1),
      3,
      'Check tires',
      'action',
      true,
      true,
      false,
      'wheelset'
    )
  $$,
  'Managers can update a draft item'
);

select results_eq(
  $$
    select i.label, i.setup_category, v.revision, e.actor_id, e.event_type
    from public.workshop_checklist_items i
    join public.workshop_checklist_versions v on v.id = i.version_id
    join public.workshop_checklist_events e
      on e.version_id = v.id and e.event_type = 'item_updated'
    where i.version_id = (select draft_id from spec13_ctx)
      and i.position = 1
  $$,
  $$values (
    'Check tires',
    'wheelset',
    4,
    '00000000-0000-0000-0000-000000000312'::uuid,
    'item_updated'
  )$$,
  'Manager update is attributed and increments revision'
);

select lives_ok(
  $$
    select public.reorder_draft_checklist_items(
      (select draft_id from spec13_ctx),
      4,
      array[
        (select id from public.workshop_checklist_items
         where version_id = (select draft_id from spec13_ctx)
           and label = 'Record torque'),
        (select id from public.workshop_checklist_items
         where version_id = (select draft_id from spec13_ctx)
           and label = 'Check tires')
      ]
    )
  $$,
  'Managers can reorder by submitting the full item id sequence'
);

select results_eq(
  $$
    select position, label
    from public.workshop_checklist_items
    where version_id = (select draft_id from spec13_ctx)
    order by position
  $$,
  $$values (1, 'Record torque'), (2, 'Check tires')$$,
  'Reorder commits dense positions 1..n'
);

select is(
  (
    select event_type
    from public.workshop_checklist_events
    where version_id = (select draft_id from spec13_ctx)
      and event_type = 'items_reordered'
  ),
  'items_reordered',
  'Reorder records items_reordered atomically'
);

select throws_ok(
  $$
    select public.reorder_draft_checklist_items(
      (select draft_id from spec13_ctx),
      5,
      array[
        (select id from public.workshop_checklist_items
         where version_id = (select draft_id from spec13_ctx)
           and position = 1),
        (select id from public.workshop_checklist_items
         where version_id = (select draft_id from spec13_ctx)
           and position = 1)
      ]
    )
  $$,
  '22023',
  'Item order is not a permutation of current items',
  'Reorder rejects duplicate ids'
);

select throws_ok(
  $$
    select public.reorder_draft_checklist_items(
      (select draft_id from spec13_ctx),
      5,
      array[
        (select id from public.workshop_checklist_items
         where version_id = (select draft_id from spec13_ctx)
           and position = 1)
      ]
    )
  $$,
  '22023',
  'Item order is not a permutation of current items',
  'Reorder rejects missing ids'
);

select results_eq(
  $$
    select position, label
    from public.workshop_checklist_items
    where version_id = (select draft_id from spec13_ctx)
    order by position
  $$,
  $$values (1, 'Record torque'), (2, 'Check tires')$$,
  'Rejected reorder does not apply a partial order'
);

select lives_ok(
  $$
    select public.remove_draft_checklist_item(
      (select id from public.workshop_checklist_items
       where version_id = (select draft_id from spec13_ctx)
         and label = 'Record torque'),
      5
    )
  $$,
  'Managers can remove a draft item'
);

select results_eq(
  $$
    select label
    from public.workshop_checklist_items
    where version_id = (select draft_id from spec13_ctx)
    order by position
  $$,
  $$values ('Check tires')$$,
  'Remove deletes only the requested draft item'
);

select is(
  (
    select count(*)::integer
    from public.workshop_checklist_items
    where id = (select sibling_item_id from spec13_ctx)
  ),
  1,
  'Remove leaves Active and Superseded items untouched'
);

select is(
  (
    select event_type
    from public.workshop_checklist_events
    where version_id = (select draft_id from spec13_ctx)
      and event_type = 'item_removed'
  ),
  'item_removed',
  'Remove records item_removed before the item row is gone'
);

select throws_ok(
  $$
    select public.add_draft_checklist_item(
      (select active_id from spec13_ctx),
      (select revision from public.workshop_checklist_versions
       where id = (select active_id from spec13_ctx)),
      'Should not write',
      'action',
      false,
      true,
      false,
      null
    )
  $$,
  '55000',
  'Checklist version is not a draft',
  'Active versions deny item writes'
);

select throws_ok(
  $$
    select public.add_draft_checklist_item(
      (select superseded_id from spec13_ctx),
      (select revision from public.workshop_checklist_versions
       where id = (select superseded_id from spec13_ctx)),
      'Should not write',
      'action',
      false,
      true,
      false,
      null
    )
  $$,
  '55000',
  'Checklist version is not a draft',
  'Superseded versions deny item writes'
);

select throws_ok(
  $$
    select public.update_draft_checklist_item(
      (select sibling_item_id from spec13_ctx),
      (select revision from public.workshop_checklist_versions
       where id = (select active_id from spec13_ctx)),
      'Should not write',
      'action',
      false,
      true,
      false,
      null
    )
  $$,
  '55000',
  'Checklist version is not a draft',
  'Active versions deny item updates'
);

select throws_ok(
  $$
    select public.remove_draft_checklist_item(
      (select sibling_item_id from spec13_ctx),
      (select revision from public.workshop_checklist_versions
       where id = (select active_id from spec13_ctx))
    )
  $$,
  '55000',
  'Checklist version is not a draft',
  'Active versions deny item removes'
);

select throws_ok(
  $$
    select public.reorder_draft_checklist_items(
      (select active_id from spec13_ctx),
      (select revision from public.workshop_checklist_versions
       where id = (select active_id from spec13_ctx)),
      array[(select sibling_item_id from spec13_ctx)]
    )
  $$,
  '55000',
  'Checklist version is not a draft',
  'Active versions deny item reorders'
);

select throws_ok(
  $$
    select public.reorder_draft_checklist_items(
      (select superseded_id from spec13_ctx),
      (select revision from public.workshop_checklist_versions
       where id = (select superseded_id from spec13_ctx)),
      array[]::uuid[]
    )
  $$,
  '55000',
  'Checklist version is not a draft',
  'Superseded versions deny item reorders'
);

select is(
  (
    select label
    from public.workshop_checklist_items
    where id = (select sibling_item_id from spec13_ctx)
  ),
  'Active only item',
  'Denied Active writes leave Active rows unchanged'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000313',
  true
);
select throws_ok(
  $$
    select public.add_draft_checklist_item(
      (select draft_id from spec13_ctx),
      6,
      'Mechanic item',
      'action',
      false,
      true,
      false,
      null
    )
  $$,
  '42501',
  'Not authorized to configure checklist items',
  'Mechanics cannot configure draft items'
);

select is_empty(
  $$select * from public.workshop_checklist_items$$,
  'Mechanics cannot read checklist items'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000314',
  true
);
select throws_ok(
  $$
    select public.add_draft_checklist_item(
      (select draft_id from spec13_ctx),
      6,
      'Partner item',
      'action',
      false,
      true,
      false,
      null
    )
  $$,
  '42501',
  'Not authorized to configure checklist items',
  'Partners cannot configure draft items'
);

select * from finish();
rollback;
