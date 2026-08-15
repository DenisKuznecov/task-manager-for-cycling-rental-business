begin;

select plan(3);

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
values (
  '00000000-0000-0000-0000-000000000601',
  'authenticated',
  'authenticated',
  'e-mtb-admin@example.com',
  '',
  now(),
  '{}',
  '{}'
);

update public.profiles
set role = 'admin'::public.user_role
where id = '00000000-0000-0000-0000-000000000601'::uuid;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000601',
  true
);

select lives_ok(
  $$select public.create_draft_checklist_version('prep', 'e-mtb')$$,
  'Admins can create an E-MTB checklist draft'
);

select results_eq(
  $$
    select t.phase, t.bike_category, v.status, v.version_number
    from public.workshop_checklist_templates t
    join public.workshop_checklist_versions v on v.template_id = t.id
    where t.phase = 'prep' and t.bike_category = 'e-mtb'
  $$,
  $$values ('prep', 'e-mtb', 'draft', 1)$$,
  'E-MTB is accepted by template and version persistence'
);

select results_eq(
  $$
    select e.event_type, e.phase, e.bike_category
    from public.workshop_checklist_events e
    join public.workshop_checklist_templates t on t.id = e.template_id
    where t.phase = 'prep' and t.bike_category = 'e-mtb'
  $$,
  $$values ('created', 'prep', 'e-mtb')$$,
  'E-MTB draft creation records an attributable category event'
);

select * from finish();
rollback;
