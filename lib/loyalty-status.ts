import { getAdminClient } from "@/lib/supabase/client";
import { tierForPoints } from "@/lib/loyalty-tiers";

/**
 * The loyalty answer Shopify reads: balance, level, what is unlocked, and what
 * the store should allow. Loyalty data only, never name, phone or address.
 */
export interface LoyaltyStatus {
  points: number;
  tier: { key: string; name: string } | null;
  unlocked: { key: string; name: string; benefit: string }[];
  next: { key: string; name: string; points: number } | null;
  pointsToNext: number | null;
  eligibility: {
    freeClassicFigure: boolean;
    /** 30 points: may buy in the 77-piece Limited sale. */
    limitedSaleAccess: boolean;
    /** 40 points: may buy 24 hours before the public opening. */
    vipEarlyAccess: boolean;
  };
}

export function statusForPoints(points: number): LoyaltyStatus {
  const t = tierForPoints(points);
  const has = (key: string) => t.unlocked.some((u) => u.key === key);
  return {
    points,
    tier: t.current ? { key: t.current.key, name: t.current.name } : null,
    unlocked: t.unlocked.map((u) => ({ key: u.key, name: u.name, benefit: u.benefit })),
    next: t.next ? { key: t.next.key, name: t.next.name, points: t.next.points } : null,
    pointsToNext: t.pointsToNext,
    eligibility: {
      freeClassicFigure: has("collector"),
      limitedSaleAccess: has("elite"),
      vipEarlyAccess: has("founder"),
    },
  };
}

export async function pointsForEmail(email: string): Promise<number> {
  const { data, error } = await getAdminClient()
    .from("loyalty_accounts")
    .select("points")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (error) throw new Error(`pointsForEmail failed: ${error.message}`);
  return data ? Number((data as { points: number }).points) : 0;
}

/** Email for a Shopify customer id, learned from their first paid order. */
export async function emailForShopifyCustomer(shopifyCustomerId: string): Promise<string | null> {
  const { data, error } = await getAdminClient()
    .from("customers")
    .select("email")
    .eq("shopify_customer_id", shopifyCustomerId)
    .maybeSingle();
  if (error) throw new Error(`emailForShopifyCustomer failed: ${error.message}`);
  return data ? (data as { email: string }).email : null;
}
