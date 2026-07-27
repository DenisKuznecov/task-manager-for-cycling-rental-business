import imageCompression from "browser-image-compression";
import { createClient } from "@/src/utils/supabase/client";
import {
  WIKI_IMAGES_BUCKET,
  buildWikiImageStoragePath,
} from "@/src/lib/wiki/storage";

export { WIKI_IMAGES_BUCKET } from "@/src/lib/wiki/storage";

// Article images are read far more often than they are written, so we compress
// aggressively (same budget as bike-fit reference photos) to protect the free
// storage/egress tiers: ~300KB max at 1920px covers instructional photos well.
const MAX_IMAGE_SIZE_MB = 0.3;
const MAX_IMAGE_DIMENSION_PX = 1920;

async function compressWikiImage(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: MAX_IMAGE_SIZE_MB,
    maxWidthOrHeight: MAX_IMAGE_DIMENSION_PX,
    useWebWorker: true,
    fileType: "image/jpeg",
  });
}

/**
 * Compresses and uploads an article image to the public `wiki-images` bucket
 * and returns its permanent public URL (safe to embed in stored Markdown).
 * Throws on failure — callers surface the message inline in the editor.
 */
export async function uploadWikiImage(
  file: File,
  documentId: string,
): Promise<string> {
  const compressed = await compressWikiImage(file);
  const storagePath = buildWikiImageStoragePath(documentId, file.name);
  const supabase = createClient();

  const { error } = await supabase.storage
    .from(WIKI_IMAGES_BUCKET)
    .upload(storagePath, compressed, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (error) {
    console.error("uploadWikiImage:", error);
    throw new Error(error.message);
  }

  const { data } = supabase.storage
    .from(WIKI_IMAGES_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}
