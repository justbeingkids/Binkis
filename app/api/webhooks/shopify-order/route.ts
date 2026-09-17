import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/client";
import { verifyWebhook } from "@/lib/shopify-verify";
import { pointsForOrder, pointsRuleFromEnv, type OrderLine } from "@/lib/loyalty-points";

export const dynamic = "force-dynamic";

/**
 * Shopify `orders/paid` webhook: the only way points are earned.
 *
 * Points are computed here from the order Shopify signed, never from a number
 * a caller sends. The order id is recorded in the same transaction as the
 * points (award_order_points), so Shopify's retries never count twice.
 */

interface ShopifyOrder {
  id?: number | string;
  email?: string | null;
  contact_email?: string | null;
  customer?: { id?: number | string; email?: string | null } | null;
  line_items?: OrderLine[];
}

export async function POST(request: Request) {
  const raw = await request.text();
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET ?? "";
  if (!verifyWebhook(raw, request.headers.get("x-shopify-hmac-sha256"), secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let order: ShopifyOrder;
  try {
    order = JSON.parse(raw) as ShopifyOrder;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const orderId = order.id != null ? String(order.id) : "";
  const email = (order.customer?.email || order.email || order.contact_email || "").trim().toLowerCase();
  // 200 on orders we deliberately skip, or Shopify retries them for 48 hours.
  if (!orderId || !email) {
    return NextResponse.json({ ok: true, skipped: "no order id or email" });
  }

  const points = pointsForOrder(order.line_items ?? [], pointsRuleFromEnv());
  const customerId = order.customer?.id != null ? String(order.customer.id) : null;

  const { data, error } = await getAdminClient().rpc("award_order_points", {
    p_order_id: orderId,
    p_email: email,
    p_points: points,
    p_shopify_customer_id: customerId,
  });
  if (error) {
    // 500 so Shopify retries; the order id guard makes the retry safe.
    console.error("award_order_points failed:", error.message);
    return NextResponse.json({ error: "could not record order" }, { status: 500 });
  }

  const row = (Array.isArray(data) ? data[0] : data) as { awarded: boolean; balance: number } | null;
  return NextResponse.json({
    ok: true,
    awarded: row?.awarded ? points : 0,
    duplicate: row ? !row.awarded : false,
  });
}
