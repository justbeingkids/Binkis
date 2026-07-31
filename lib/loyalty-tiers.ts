/**
 * Loyalty tier model — the single source of truth for the collector levels.
 *
 * Points are earned by PURCHASES only (1 per Binkis piece; a complete
 * collection = 8 + 5 bonus = 13). Winning a Limited Edition does NOT grant
 * points — its value is the rare find itself.
 *
 * The backend owns: balance, level, unlocked benefits, and eligibility.
 * Shopify only applies the discount / enables the free product when the
 * corresponding tier is reached.
 */

export interface Tier {
  key: "collector" | "elite" | "founder";
  name: string;
  points: number;
  benefit: string;
}

/** Ascending by threshold. Benefits are cumulative (permanent once unlocked). */
export const TIERS: Tier[] = [
  { key: "collector", name: "Collector", points: 20, benefit: "Figura clasica BINKIS gratis" },
  { key: "elite", name: "Elite Collector", points: 30, benefit: "Premium Display Case a $49 MXN (1 pieza)" },
  { key: "founder", name: "Founder Reserve", points: 40, benefit: "VIP de por vida — Founders Reserve permanente" },
];

export interface TierStatus {
  points: number;
  /** Highest tier reached, or null below the first threshold. */
  current: Tier | null;
  /** Every tier reached (its benefits are unlocked, permanently). */
  unlocked: Tier[];
  /** Next tier to reach, or null once the top tier is reached. */
  next: Tier | null;
  /** Points still needed to reach `next`, or null at the top. */
  pointsToNext: number | null;
}

/** Resolve a points balance into the collector level + unlocked benefits. */
export function tierForPoints(points: number): TierStatus {
  const unlocked = TIERS.filter((t) => points >= t.points);
  const next = TIERS.find((t) => points < t.points) ?? null;
  return {
    points,
    current: unlocked.length > 0 ? unlocked[unlocked.length - 1] : null,
    unlocked,
    next,
    pointsToNext: next ? next.points - points : null,
  };
}
