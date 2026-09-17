/**
 * How many loyalty points a paid Shopify order is worth.
 *
 * Client's model (confirmed 2026-07-31): 1 point per BINKIS piece bought
 * online, and a complete collection is worth 13 (8 pieces + 5 bonus).
 *
 * Kept free of imports so the rule can be checked on its own.
 */

export interface OrderLine {
  quantity?: number | null;
  sku?: string | null;
  gift_card?: boolean | null;
}

export interface PointsRule {
  /** SKUs of the complete-collection bundle, worth `collectionPoints` each. */
  collectionSkus: string[];
  /** If set, only SKUs starting with one of these count as pieces. */
  pieceSkuPrefixes: string[];
  collectionPoints: number;
}

function list(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

export function pointsRuleFromEnv(env: Record<string, string | undefined> = process.env): PointsRule {
  return {
    collectionSkus: list(env.LOYALTY_COLLECTION_SKUS),
    pieceSkuPrefixes: list(env.LOYALTY_PIECE_SKU_PREFIXES),
    collectionPoints: 13,
  };
}

export function pointsForOrder(lines: OrderLine[], rule: PointsRule): number {
  let points = 0;
  for (const line of lines) {
    if (line.gift_card) continue;
    const qty = Math.max(0, Math.trunc(Number(line.quantity ?? 0)));
    if (qty === 0) continue;
    const sku = (line.sku ?? "").trim().toUpperCase();

    if (sku && rule.collectionSkus.includes(sku)) {
      points += qty * rule.collectionPoints;
      continue;
    }
    // With no prefixes configured every product line counts, which is right
    // for a store that only sells pieces. Add prefixes once it sells anything
    // else (display cases, apparel) so those never earn points.
    if (rule.pieceSkuPrefixes.length > 0 && !rule.pieceSkuPrefixes.some((p) => sku.startsWith(p))) {
      continue;
    }
    points += qty;
  }
  return points;
}
