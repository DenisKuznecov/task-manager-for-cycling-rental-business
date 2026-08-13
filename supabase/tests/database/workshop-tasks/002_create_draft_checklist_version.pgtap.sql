begin;

select plan(25);

select has_column(
  'public',
  'workshop_checklist_versions',
  'created_by',
  'Versions record the creating actor'
);
select has_column(
  'public',
  'workshop_checklist_versions',
  'revision',
  'Versions carry a revision for later stale-write protection'
);
select has_table(
  'public',
  'workshop_checklist_events',
  'Attributed checklist events are persisted'
);
select has_function(
  'public',
  'create_draft_checklist_version',
  array['text', 'text'],
  'Draft allocation is a privileged database capability'
);
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
select ok(not has_table_privilege(
  'authenticated',
  'public.workshop_checklist_events',
  'DELETE'
), 'Authenticated users cannot delete events directly');
select ok(not has_table_privilege(
  'authenticated',
  'public.workshop_checklist_versions',
  'INSERT'
), 'Authenticated users cannot create versions directly');
select ok(not has_function_privilege(
  'anon',
  'public.create_draft_checklist_version(text, text)',
  'EXECUTE'
), 'Anonymous users cannot execute draft allocation');
select ok(has_function_privilege(
  'authenticated',
  'public.create_draft_checklist_version(text, text)',
  'EXECUTE'
), 'Authenticated users can execute draft allocation');

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
  ('00000000-0000-0000-0000-000000000211', 'authenticated', 'authenticated', 'draft-admin@example.com', '', now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000212', 'authenticated', 'authenticated', 'draft-manager@example.com', '', now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000213', 'authenticated', 'authenticated', 'draft-mechanic@example.com', '', now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000214', 'authenticated', 'authenticated', 'draft-partner@example.com', '', now(), '{}', '{}');

update public.profiles
set role = case id
  when '00000000-0000-0000-0000-000000000211'::uuid then 'admin'::public.user_role
  when '00000000-0000-0000-0000-000000000212'::uuid then 'manager'::public.user_role
  when '00000000-0000-0000-0000-000000000213'::uuid then 'mechanic'::public.user_role
  else 'partner'::public.user_role
end
where id in (
  '00000000-0000-0000-0000-000000000211'::uuid,
  '00000000-0000-0000-0000-000000000212'::uuid,
  '00000000-0000-0000-0000-000000000213'::uuid,
  '00000000-0000-0000-0000-000000000214'::uuid
);

insert into public.workshop_checklist_templates (id, phase, bike_category)
values ('00000000-0000-0000-0000-000000000215', 'prep', 'road');
insert into public.workshop_checklist_versions (
  id,
  template_id,
  version_number,
  status
)
values (
  '00000000-0000-0000-0000-000000000216',
  '00000000-0000-0000-0000-000000000215',
  1,
  'active'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000211',
  true
);

select lives_ok(
  $$select public.create_draft_checklist_version('return', 'mtb')$$,
  'Admins can create a draft for a selected pairing'
);

select results_eq(
  $$
    select v.status, v.version_number, v.revision, v.created_by
    from public.workshop_checklist_versions v
    join public.workshop_checklist_templates t on t.id = v.template_id
    where t.phase = 'return' and t.bike_category = 'mtb'
  $$,
  $$values ('draft', 1, 1, '00000000-0000-0000-0000-000000000211'::uuid)$$,
  'Admin drafts start at version 1 revision 1 with attributed creator'
);

select results_eq(
  $$
    select e.event_type, e.actor_id, e.phase, e.bike_category, e.version_number, e.revision
    from public.workshop_checklist_events e
    join public.workshop_checklist_templates t on t.id = e.template_id
    where t.phase = 'return' and t.bike_category = 'mtb'
  $$,
  $$values (
    'created',
    '00000000-0000-0000-0000-000000000211'::uuid,
    'return',
    'mtb',
    1,
    1
  )$$,
  'Creation records an attributed event atomically'
);

select lives_ok(
  $$select public.create_draft_checklist_version('prep', 'road')$$,
  'Admins can create a replacement draft beside an Active version'
);

select results_eq(
  $$
    select v.status, v.version_number
    from public.workshop_checklist_versions v
    where v.template_id = '00000000-0000-0000-0000-000000000215'
    order by v.version_number
  $$,
  $$values ('active', 1), ('draft', 2)$$,
  'Creating a draft does not mutate Active or Superseded rows'
);

select ok(
  public.create_draft_checklist_version('prep', 'e-city') is not null
  and public.create_draft_checklist_version('prep', 'e-city') is not null,
  'Two accepted creates for the same pairing both succeed'
);

select results_eq(
  $$
    select v.version_number
    from public.workshop_checklist_versions v
    join public.workshop_checklist_templates t on t.id = v.template_id
    where t.phase = 'prep' and t.bike_category = 'e-city'
    order by v.version_number
  $$,
  $$values (1), (2)$$,
  'Concurrent creates allocate distinct monotonic version numbers'
);

select throws_ok(
  $$select public.create_draft_checklist_version('dispatch', 'road')$$,
  '22023',
  'Unsupported checklist phase',
  'Unsupported phases are rejected'
);

select throws_ok(
  $$select public.create_draft_checklist_version('prep', 'commuter')$$,
  '22023',
  'Unsupported bike category',
  'Unsupported categories are rejected'
);

select is(
  (
    select count(*)::integer
    from public.workshop_checklist_events e
    where e.phase = 'dispatch' or e.bike_category = 'commuter'
  ),
  0,
  'Invalid input does not record an event'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000212',
  true
);

select lives_ok(
  $$select public.create_draft_checklist_version('return', 'gravel')$$,
  'Managers can create a draft for a selected pairing'
);

select results_eq(
  $$
    select e.actor_id, v.created_by
    from public.workshop_checklist_events e
    join public.workshop_checklist_versions v on v.id = e.version_id
    join public.workshop_checklist_templates t on t.id = e.template_id
    where t.phase = 'return' and t.bike_category = 'gravel'
  $$,
  $$values (
    '00000000-0000-0000-0000-000000000212'::uuid,
    '00000000-0000-0000-0000-000000000212'::uuid
  )$$,
  'Manager creation is attributed to the manager'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000213',
  true
);
select throws_ok(
  $$select public.create_draft_checklist_version('prep', 'mtb')$$,
  '42501',
  'Not authorized to create a checklist draft',
  'Mechanics cannot create drafts'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000214',
  true
);
select throws_ok(
  $$select public.create_draft_checklist_version('prep', 'mtb')$$,
  '42501',
  'Not authorized to create a checklist draft',
  'Partners cannot create drafts'
);

reset role;
select throws_ok(
  $$update public.workshop_checklist_events set revision = revision$$,
  '55000',
  'Workshop checklist events are append-only',
  'Events cannot be updated'
);

select * from finish();
rollback;
