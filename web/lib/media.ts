import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export const MEDIA_BUCKET = "salon-media";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export type MediaFolder = "logo" | "staff" | "gallery";

export class MediaError extends Error {}

/**
 * Uploads one image into <salon_id>/<folder>/<uuid>.<ext>. The storage RLS
 * policies only allow members of that salon to write under its prefix, so a
 * user-session client is enough — no service role needed.
 */
export async function uploadSalonImage(
  supabase: SupabaseClient<Database>,
  salonId: string,
  folder: MediaFolder,
  file: File
): Promise<{ path: string; url: string }> {
  if (!(file instanceof File) || file.size === 0) throw new MediaError("Choose an image to upload.");
  const ext = ALLOWED.get(file.type);
  if (!ext) throw new MediaError("Use a JPG, PNG, WebP or GIF image.");
  if (file.size > MAX_IMAGE_BYTES) throw new MediaError("Images must be 5 MB or smaller.");

  const path = `${salonId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new MediaError(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export async function removeSalonImage(supabase: SupabaseClient<Database>, path: string | null | undefined): Promise<void> {
  if (!path) return;
  await supabase.storage.from(MEDIA_BUCKET).remove([path]);
}

/** Derives the storage path from a public URL we generated earlier (best effort). */
export function storagePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/object/public/${MEDIA_BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx === -1 ? null : decodeURIComponent(url.slice(idx + marker.length));
}
