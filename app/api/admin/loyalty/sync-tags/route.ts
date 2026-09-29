import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getAdminClient } from "@/lib/supabase/client";
import { addCustomerTags, adminConfigured, tagsForPoints } from "@/lib/shopify-admin";

export const dynamic = "force-dynamic";

/**
 * Give every existing customer the tags their points already earned.
 *
 * Tagging happens per order from now on, but anyone who bought before that
 * shipped has points and no tag, and the store would block them from a sale
 * they are entitled to. Run once after the Admin token is configured, and
 * again any time the tag rules change.
 *
 * Idempotent: tagsAdd only appends, so running it twice changes nothing.
 */
export async function POST() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!(await adminConfigured())) {
    return NextResponse.json(
      { error: "Falta SHOPIFY_STORE_DOMAIN, o la app no esta instalada todavia" },
      { status: 400 },
    );
  }

  const db = getAdminClient();
  const { data: accounts, error } = await db
    .from("loyalty_accounts")
    .select("email,points")
    .gt("points", 0);
  if (error) {
    return NextResponse.json({ error: `loyalty_accounts: ${error.message}` }, { status: 500 });
  }

  const rows = (accounts ?? []) as { email: string; points: number }[];
  const eligible = rows.filter((r) => tagsForPoints(Number(r.points)).length > 0);

  // One lookup for the whole set: the Shopify customer id is only known for
  // people who have completed a paid order through the webhook.
  const { data: customers, error: customerError } = await db
    .from("customers")
    .select("email,shopify_customer_id")
    .in("email", eligible.map((r) => r.email));
  if (customerError) {
    return NextResponse.json({ error: `customers: ${customerError.message}` }, { status: 500 });
  }
  const idByEmail = new Map(
    ((customers ?? []) as { email: string; shopify_customer_id: string | null }[])
      .filter((c) => c.shopify_customer_id)
      .map((c) => [c.email, c.shopify_customer_id as string]),
  );

  let tagged = 0;
  let failed = 0;
  const unknown: string[] = [];

  for (const row of eligible) {
    const shopifyId = idByEmail.get(row.email);
    if (!shopifyId) {
      unknown.push(row.email);
      continue;
    }
    const ok = await addCustomerTags(shopifyId, tagsForPoints(Number(row.points)));
    if (ok) tagged += 1;
    else failed += 1;
  }

  return NextResponse.json({
    ok: true,
    accountsWithPoints: rows.length,
    eligibleForATag: eligible.length,
    tagged,
    failed,
    // Points earned under an email Shopify never sent us a customer id for.
    withoutShopifyCustomer: unknown.length,
  });
}
