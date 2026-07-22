-- Add a human-readable title to marketing links for display purposes.
-- The DEFAULT '' makes the NOT NULL addition safe against any existing rows,
-- then the default is dropped so future inserts must supply a title.

ALTER TABLE public.marketing_links
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';

ALTER TABLE public.marketing_links
  ALTER COLUMN title DROP DEFAULT;
