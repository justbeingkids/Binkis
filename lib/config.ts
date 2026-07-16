/**
 * App configuration / tunables.
 *
 * Business values live here (backed by env vars) instead of being hard-coded
 * inside logic. Character list, quotas and weights live in the database
 * (admin-managed); this file holds only cross-cutting numeric knobs.
 */

function intFromEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isInteger(n) ? n : fallback;
}

export const config = {
  /** Loyalty points granted to a winner when they claim a Limited Edition. */
  winnerBonusPoints: intFromEnv("WINNER_BONUS_POINTS", 5),
};

/**
 * Character image upload limits. Shared by the browser (client-side validation)
 * and the server (Storage bucket file-size limit). Uploads go straight from the
 * browser to Supabase Storage via a signed URL, so they are NOT bound by the
 * Next.js / Vercel serverless request-body limit (~4.5 MB).
 */
export const imageUpload = {
  maxBytes: 15 * 1024 * 1024, // 15 MB
  allowedTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
} as const;
