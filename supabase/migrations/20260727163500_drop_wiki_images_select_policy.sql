-- The wiki-images bucket is public, so file reads go through the public URL
-- endpoint and do not need an RLS SELECT on storage.objects. The previous
-- "Staff can view wiki images" policy let any authenticated client list every
-- object in the bucket (Supabase advisor: "Clients can list all files").
-- Upload / replace / delete policies for admin/manager are unchanged.

drop policy if exists "Staff can view wiki images" on storage.objects;
