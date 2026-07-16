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
