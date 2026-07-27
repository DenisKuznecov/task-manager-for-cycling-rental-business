/**
 * Pure constants and path builders for the public wiki media bucket.
 * Kept free of browser-only imports so server code can reuse them.
 */

/**
 * Bucket id is historical — it was created for images only, but now stores
 * every media type BlockNote can embed (images, video, audio, files).
 * Renaming a Supabase bucket in-place isn't supported, and the id is already
 * baked into staging, so it stays `wiki-images`.
 */
export const WIKI_MEDIA_BUCKET = "wiki-images";

/**
 * Builds a unique object path inside the wiki media bucket. Files are grouped
 * per document so orphans are easy to find, and the timestamp keeps
 * re-uploads of the same file name from colliding.
 *
 * `forcedExtension` overrides the original extension (used when the client
 * re-encodes images to JPEG before uploading).
 */
export function buildWikiMediaStoragePath(
  documentId: string,
  fileName: string,
  forcedExtension?: string,
): string {
  const originalExtension = fileName.includes(".")
    ? (fileName.split(".").pop() ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 8)
    : "";
  const extension = forcedExtension ?? (originalExtension || "bin");

  const base = fileName
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${documentId}/${Date.now()}-${base || "file"}.${extension}`;
}
