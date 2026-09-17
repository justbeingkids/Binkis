import { NextResponse } from "next/server";
import { verifyAppProxy } from "@/lib/shopify-verify";
import { emailForShopifyCustomer, pointsForEmail, statusForPoints } from "@/lib/loyalty-status";

export const dynamic = "force-dynamic";

/**
 * Loyalty status for the customer signed in to the store, via Shopify App
 * Proxy (e.g. binkis.xyz/apps/binkis/loyalty -> here).
 *
 * Shopify signs the forwarded request and supplies logged_in_customer_id
 * itself, so a customer can only ever read their own balance, no key lives in
 * the theme, and no email travels in a URL.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (!verifyAppProxy(params, process.env.SHOPIFY_API_SECRET ?? "")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const noStore = { headers: { "Cache-Control": "no-store" } };
  const customerId = params.get("logged_in_customer_id");
  if (!customerId) {
    return NextResponse.json({ loggedIn: false }, noStore);
  }

  try {
    // A customer with no paid order yet has no mapping, and also no points.
    const email = await emailForShopifyCustomer(customerId);
    const points = email ? await pointsForEmail(email) : 0;
    return NextResponse.json({ loggedIn: true, ...statusForPoints(points) }, noStore);
  } catch (err) {
    console.error("loyalty proxy failed:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
