/**
 * Mirrors `public.wiki_slugify` in Postgres so client/server validation
 * rejects names that would produce reserved slugs (e.g. `uncategorized`).
 */
export function wikiSlugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
