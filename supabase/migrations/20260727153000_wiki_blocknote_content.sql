-- BlockNote adoption for the wiki.
--
-- 1. `wiki_documents.content` now stores BlockNote block JSON (the editor's
--    lossless native format) instead of Markdown. Searching that column would
--    match JSON keys/props, so a `content_text` companion column carries the
--    extracted plain text. It is written by the app on every save; legacy
--    Markdown rows are backfilled with their raw content (markdown syntax is
--    close enough to plain text for ILIKE search until the row is re-saved).
--
-- 2. The wiki media bucket accepts every media type BlockNote can embed
--    (image, video, audio, file blocks), not just images. The bucket id stays
--    `wiki-images` — Supabase buckets cannot be renamed in place.

alter table public.wiki_documents
  add column if not exists content_text text not null default '';

update public.wiki_documents
set content_text = coalesce(content, '')
where content_text = ''
  and coalesce(content, '') <> '';

-- Adding a column at the end keeps CREATE OR REPLACE VIEW valid.
create or replace view public.wiki_documents_view with (security_invoker = 'true') as
select
  d.id,
  d.title,
  d.slug,
  d.content,
  d.status,
  d.category_id,
  c.name as category_name,
  c.slug as category_slug,
  c.color as category_color,
  d.published_at,
  d.created_at,
  d.updated_at,
  d.content_text
from public.wiki_documents d
left join public.wiki_categories c on c.id = d.category_id;

-- Images stay compressed client-side (~300 KB); the 25 MiB limit is a
-- backstop for the video/audio/file embeds, which upload uncompressed.
update storage.buckets
set
  file_size_limit = 26214400,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/webm',
    'audio/ogg',
    'application/pdf'
  ]
where id = 'wiki-images';
