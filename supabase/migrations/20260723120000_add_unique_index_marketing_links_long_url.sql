-- Enforce one row per long URL so two partners can never share the same short link.
-- The API dedup check handles the normal flow; this index is a hard DB-level guarantee
-- that covers races and any future code path that skips the check.
CREATE UNIQUE INDEX IF NOT EXISTS marketing_links_long_url_key
  ON public.marketing_links (long_url);
