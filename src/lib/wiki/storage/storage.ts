/**
 * Pure constants and path builders for the public `wiki-images` bucket.
 * Kept free of browser-only imports so server code can reuse them.
 */

export const WIKI_IMAGES_BUCKET = "wiki-images";

/**
 * Builds a unique object path inside the `wiki-images` bucket. Images are
 * grouped per document so orphans are easy to find, and the timestamp keeps
 * re-uploads of the same file name from colliding.
 */
export function buildWikiImageStoragePath(
  documentId: string,
  fileName: string,
): string {
  const base = fileName
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${documentId}/${Date.now()}-${base || "image"}.jpg`;
}
