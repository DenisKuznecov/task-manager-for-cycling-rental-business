import imageCompression from "browser-image-compression";
import { createClient } from "@/src/utils/supabase/client";
import {
  WIKI_MEDIA_BUCKET,
  buildWikiMediaStoragePath,
} from "@/src/lib/wiki/storage";

export { WIKI_MEDIA_BUCKET } from "@/src/lib/wiki/storage";

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

// Re-encoding a GIF to JPEG would freeze the animation, so GIFs skip
// compression like non-image media does.
function isCompressibleImage(file: File): boolean {
  return file.type.startsWith("image/") && file.type !== "image/gif";
}

/**
 * Uploads a media file (image, video, audio, or document) embedded from the
 * BlockNote editor to the public wiki media bucket and returns its permanent
 * public URL (safe to store in the document body). Images are re-encoded to
 * JPEG and compressed first; other media uploads as-is, bounded by the
 * bucket's size limit and mime-type allowlist.
 * Throws on failure — callers surface the message inline in the editor.
 */
export async function uploadWikiMedia(
  file: File,
  documentId: string,
): Promise<string> {
  const compressImage = isCompressibleImage(file);
  const payload = compressImage ? await compressWikiImage(file) : file;
  const contentType = compressImage
    ? "image/jpeg"
    : file.type || "application/octet-stream";
  const storagePath = buildWikiMediaStoragePath(
    documentId,
    file.name,
    compressImage ? "jpg" : undefined,
  );

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(WIKI_MEDIA_BUCKET)
    .upload(storagePath, payload, {
      contentType,
      upsert: false,
    });

  if (error) {
    console.error("uploadWikiMedia:", error);
    throw new Error(error.message);
  }

  const { data } = supabase.storage
    .from(WIKI_MEDIA_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}
