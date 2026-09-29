import { NextResponse } from "next/server";
import { installUrl, isValidShop, makeState, shopDomain } from "@/lib/shopify-oauth";

export const dynamic = "force-dynamic";

/**
 * Start the install. Open this in a browser signed in to the store as staff
 * and Shopify shows the permission screen; approving sends the token to the
 * callback below.
 *
 * Deliberately open, and deliberately fixed to SHOPIFY_STORE_DOMAIN. Anyone
 * who opens it only reaches a consent screen for that one store, which only a
 * store admin can approve, so there is nothing here to protect with a login
 * the store's developer would not have.
 */
export async function GET(request: Request) {
  const shop = shopDomain();
  if (!isValidShop(shop)) {
    return NextResponse.json(
      { error: "SHOPIFY_STORE_DOMAIN is not set to a myshopify.com domain" },
      { status: 500 },
    );
  }
  if (!process.env.SHOPIFY_OAUTH_CLIENT_ID || !process.env.SHOPIFY_OAUTH_CLIENT_SECRET) {
    return NextResponse.json({ error: "Faltan las credenciales de la app" }, { status: 500 });
  }

  const redirectUri = new URL("/api/shopify/callback", request.url).toString();
  const state = await makeState(shop);
  return NextResponse.redirect(installUrl(shop, state, redirectUri));
}
