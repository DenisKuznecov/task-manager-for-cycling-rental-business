-- Public bucket for wiki article images. Image URLs are embedded permanently
-- in document Markdown, so reads must work without signing (public endpoint).
-- The client compresses uploads to ~300 KB; the 5 MiB limit is a backstop.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wiki-images',
  'wiki-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Write access mirrors wiki document management: admin/manager only.

drop policy if exists "Editors can upload wiki images" on storage.objects;

create policy "Editors can upload wiki images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'wiki-images'
  and public.get_user_role() = any (array['admin'::public.user_role, 'manager'::public.user_role])
);

drop policy if exists "Editors can replace wiki images" on storage.objects;

create policy "Editors can replace wiki images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'wiki-images'
  and public.get_user_role() = any (array['admin'::public.user_role, 'manager'::public.user_role])
)
with check (
  bucket_id = 'wiki-images'
  and public.get_user_role() = any (array['admin'::public.user_role, 'manager'::public.user_role])
);

drop policy if exists "Editors can delete wiki images" on storage.objects;

create policy "Editors can delete wiki images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'wiki-images'
  and public.get_user_role() = any (array['admin'::public.user_role, 'manager'::public.user_role])
);

-- Anonymous access already works through the public-bucket endpoint; this
-- covers authenticated API reads (e.g. listing a document's images).

drop policy if exists "Staff can view wiki images" on storage.objects;

create policy "Staff can view wiki images"
on storage.objects
for select
to authenticated
using (bucket_id = 'wiki-images');
