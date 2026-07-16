import { getAdminClient } from "./client";
import { imageUpload } from "@/lib/config";

/** Public storage bucket that holds character artwork. */
export const CHARACTER_IMAGE_BUCKET = "character-images";

let bucketReady = false;

/**
 * Create (or update) the public bucket on first use so no manual dashboard
 * setup is needed, and keep its file-size limit in sync with the config.
 */
async function ensureBucket(): Promise<void> {
  if (bucketReady) return;
  const supabase = getAdminClient();
  const { data } = await supabase.storage.getBucket(CHARACTER_IMAGE_BUCKET);
  if (!data) {
    const { error } = await supabase.storage.createBucket(CHARACTER_IMAGE_BUCKET, {
      public: true,
      fileSizeLimit: imageUpload.maxBytes,
    });
    // Ignore "already exists" races between concurrent uploads.
    if (error && !/already exists/i.test(error.message)) {
      throw new Error(`createBucket failed: ${error.message}`);
    }
  } else {
    // Bucket may predate the current limit; bring it up to date.
    await supabase.storage.updateBucket(CHARACTER_IMAGE_BUCKET, {
      public: true,
      fileSizeLimit: imageUpload.maxBytes,
    });
  }
  bucketReady = true;
}

/** One stable object per character; new uploads overwrite the old art. */
function objectPath(characterId: string): string {
  return `characters/${characterId}`;
}

/**
 * Mint a short-lived signed upload URL so the browser can PUT the file straight
 * to Supabase Storage (bypassing the Next/Vercel request-body limit). Only ever
 * called from an admin-authed route.
 */
export async function createImageUploadTicket(
  characterId: string
): Promise<{ bucket: string; path: string; token: string }> {
  await ensureBucket();
  const supabase = getAdminClient();
  const path = objectPath(characterId);
  const { data, error } = await supabase.storage
    .from(CHARACTER_IMAGE_BUCKET)
    .createSignedUploadUrl(path, { upsert: true });
  if (error || !data) throw new Error(`createSignedUploadUrl failed: ${error?.message ?? "no data"}`);
  return { bucket: CHARACTER_IMAGE_BUCKET, path, token: data.token };
}

/** Cache-busted public URL for a character's uploaded object. */
export function publicImageUrl(characterId: string, bust: number): string {
  const supabase = getAdminClient();
  const { data } = supabase.storage.from(CHARACTER_IMAGE_BUCKET).getPublicUrl(objectPath(characterId));
  return `${data.publicUrl}?v=${bust}`;
}

/** Remove a character's stored image object (no-op if it was never uploaded). */
export async function removeCharacterImage(characterId: string): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase.storage.from(CHARACTER_IMAGE_BUCKET).remove([objectPath(characterId)]);
  if (error) throw new Error(`remove image failed: ${error.message}`);
}

/** Persist (or clear) the image URL on the character row. */
export async function setCharacterImageUrl(characterId: string, url: string | null): Promise<void> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("characters")
    .update({ image_url: url })
    .eq("id", characterId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`setCharacterImageUrl failed: ${error.message}`);
  if (!data) throw new Error("not_found");
}
