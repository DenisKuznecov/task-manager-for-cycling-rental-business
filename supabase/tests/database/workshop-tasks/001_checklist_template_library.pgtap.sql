begin;

select plan(19);

select has_table(
  'public',
  'workshop_checklist_templates',
  'Checklist templates are persisted'
);
select has_table(
  'public',
  'workshop_checklist_versions',
  'Checklist versions are persisted'
);
select has_view(
  'public',
  'workshop_checklist_template_library_view',
  'The library read model exists'
);
select col_is_pk(
  'public',
  'workshop_checklist_templates',
  'id',
  'Templates use UUID primary identities'
);
select col_is_pk(
  'public',
  'workshop_checklist_versions',
  'id',
  'Versions use UUID primary identities'
);
select ok(not has_table_privilege(
  'authenticated',
  'public.workshop_checklist_templates',
  'INSERT'
), 'Authenticated users cannot create templates directly');
select ok(not has_table_privilege(
  'authenticated',
  'public.workshop_checklist_versions',
  'INSERT'
), 'Authenticated users cannot create versions directly');
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
  'anon',
  'public.workshop_checklist_template_library_view',
  'SELECT'
), 'Anonymous users cannot read the library');

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
  ('00000000-0000-0000-0000-000000000111', 'authenticated', 'authenticated', 'template-admin@example.com', '', now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000222', 'authenticated', 'authenticated', 'template-manager@example.com', '', now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000333', 'authenticated', 'authenticated', 'template-mechanic@example.com', '', now(), '{}', '{}'),
  ('00000000-0000-0000-0000-000000000444', 'authenticated', 'authenticated', 'template-partner@example.com', '', now(), '{}', '{}');

update public.profiles
set role = case id
  when '00000000-0000-0000-0000-000000000111'::uuid then 'admin'::public.user_role
  when '00000000-0000-0000-0000-000000000222'::uuid then 'manager'::public.user_role
  when '00000000-0000-0000-0000-000000000333'::uuid then 'mechanic'::public.user_role
  else 'partner'::public.user_role
end
where id in (
  '00000000-0000-0000-0000-000000000111'::uuid,
  '00000000-0000-0000-0000-000000000222'::uuid,
  '00000000-0000-0000-0000-000000000333'::uuid,
  '00000000-0000-0000-0000-000000000444'::uuid
);

insert into public.workshop_checklist_templates (id, phase, bike_category)
values ('00000000-0000-0000-0000-000000000555', 'prep', 'road');
insert into public.workshop_checklist_versions (template_id, version_number, status)
values ('00000000-0000-0000-0000-000000000555', 1, 'active');
select throws_ok(
  $$insert into public.workshop_checklist_versions (template_id, version_number, status)
    values ('00000000-0000-0000-0000-000000000555', 2, 'active')$$,
  '23505',
  'duplicate key value violates unique constraint "workshop_checklist_versions_one_active_per_template_idx"',
  'A template can have only one active version'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000111',
  true
);
select results_eq(
  $$select count(*)::integer from public.workshop_checklist_template_library_view$$,
  $$values (1)$$,
  'Admins can read the library view'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000222',
  true
);
select results_eq(
  $$select count(*)::integer from public.workshop_checklist_template_library_view$$,
  $$values (1)$$,
  'Managers can read the library view'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000333',
  true
);
select is_empty(
  $$select * from public.workshop_checklist_template_library_view$$,
  'Mechanics cannot read the library view'
);
select is_empty(
  $$select * from public.workshop_checklist_templates$$,
  'Mechanics cannot directly read checklist templates'
);
select is_empty(
  $$select * from public.workshop_checklist_versions$$,
  'Mechanics cannot directly read checklist versions'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000444',
  true
);
select is_empty(
  $$select * from public.workshop_checklist_template_library_view$$,
  'Partners cannot read the library view'
);
select is_empty(
  $$select * from public.workshop_checklist_templates$$,
  'Partners cannot directly read checklist templates'
);
select is_empty(
  $$select * from public.workshop_checklist_versions$$,
  'Partners cannot directly read checklist versions'
);

select * from finish();
rollback;
