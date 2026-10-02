import { NextResponse } from "next/server";
import { shopDomain } from "@/lib/shopify-oauth";
import { adminConfigured } from "@/lib/shopify-admin";

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
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
