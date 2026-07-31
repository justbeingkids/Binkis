/**
 * App configuration / tunables. Character list, quotas and weights live in the
 * database (admin-managed); this file holds only cross-cutting knobs.
 *
 * Note: loyalty tier thresholds/benefits live in lib/loyalty-tiers.ts.
 */

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
