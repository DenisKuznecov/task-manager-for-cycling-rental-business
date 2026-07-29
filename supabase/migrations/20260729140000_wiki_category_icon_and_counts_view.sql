-- Wiki categories: optional Feather icon key + RLS-aware counts view.
--
-- `icon` stores an allowlisted @subframe/core export name (e.g. FeatherBookOpen).
-- The app validates values; unknown/null icons fall back in the UI.

alter table public.wiki_categories
  add column if not exists icon text;

create or replace view public.wiki_categories_view
with (security_invoker = true)
as
select
  c.id,
  c.name,
  c.slug,
  c.color,
  c.icon,
  c.created_at,
  (
    select count(*)::integer
    from public.wiki_documents d
    where d.category_id = c.id
  ) as document_count
from public.wiki_categories c;

grant all on table public.wiki_categories_view to anon;
grant all on table public.wiki_categories_view to authenticated;
grant all on table public.wiki_categories_view to service_role;
