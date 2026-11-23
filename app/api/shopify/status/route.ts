import { NextResponse } from "next/server";
import { SCOPES, shopDomain, storedScopes } from "@/lib/shopify-oauth";
import { adminConfigured } from "@/lib/shopify-admin";
import { pointsRuleFromEnv } from "@/lib/loyalty-points";

export const dynamic = "force-dynamic";

/**
 * What this deployment is pointed at, so "which app is it using?" stops being
 * a round trip through chat.
 *
 * Shopify answers application_cannot_be_found when the client_id in the
 * install link belongs to an app that no longer exists, which is exactly what
 * happens when the app is recreated and only one side updates. That question
 * should be answerable by whoever is looking at the error.
 *
 * Prefixes and booleans only: the first eight characters of a public client id
 * are enough to tell two apps apart and cannot be used to authenticate as
 * either, and secrets are reported as present or absent, never echoed.
 */
export async function GET() {
  const clientId = process.env.SHOPIFY_OAUTH_CLIENT_ID ?? "";
  const secret = process.env.SHOPIFY_OAUTH_CLIENT_SECRET ?? "";
  const proxySecret = process.env.SHOPIFY_API_SECRET ?? "";
  const staticToken = Boolean(process.env.SHOPIFY_ADMIN_TOKEN);
  const granted = await storedScopes();
  const rule = pointsRuleFromEnv();

  return NextResponse.json(
    {
      shop: shopDomain() || null,
      oauthClientId: clientId ? `${clientId.slice(0, 8)}...` : null,
      oauthClientSecret: secret ? "configurado" : "falta",
      appProxySecret: proxySecret ? "configurado" : "falta",
      webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET ? "configurado" : "falta",
      // True once the app has been installed and the token stored, which is
      // what decides whether customer tags can be written at all.
      canWriteCustomerTags: await adminConfigured(),

      // Asked for against actually granted, because they drift. Widening
      // SCOPES does nothing until somebody re-authorises, and before this
      // pair existed the only way to find out was to watch an order fail.
      tokenSource: staticToken ? "SHOPIFY_ADMIN_TOKEN" : granted ? "oauth" : "ninguno",
      requestedScopes: SCOPES.split(","),
      grantedScopes: granted,
      // The zero-value order raised for a hologram winner needs write_orders.
      // False with tokenSource "oauth" means the install has to be re-run.
      // Unknowable for a static token, which carries its scopes out of band.
      canCreateOrders: staticToken ? null : (granted?.includes("write_orders") ?? false),

      // Counts, never the SKUs themselves: this answers "are the points rules
      // configured at all", which is the question that matters before the
      // first real sale. Both zero means every line of every order earns a
      // point, so a display case would score the same as a figure.
      loyaltyRules: {
        pieceSkuPrefixes: rule.pieceSkuPrefixes.length,
        collectionSkus: rule.collectionSkus.length,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
