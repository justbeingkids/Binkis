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
  // Names only, never values. Whoever opens this link is the person who can
  // fix it, and a blank 500 tells them nothing.
  const missing = (
    [
      ["SHOPIFY_STORE_DOMAIN", process.env.SHOPIFY_STORE_DOMAIN],
      ["SHOPIFY_OAUTH_CLIENT_ID", process.env.SHOPIFY_OAUTH_CLIENT_ID],
      ["SHOPIFY_OAUTH_CLIENT_SECRET", process.env.SHOPIFY_OAUTH_CLIENT_SECRET],
      // Signs the state that survives the round trip to Shopify.
      ["SESSION_SECRET", process.env.SESSION_SECRET],
    ] as const
  )
    .filter(([, value]) => !value || value.trim() === "")
    .map(([name]) => name);

  if (missing.length > 0) {
    return NextResponse.json({ error: "Faltan variables de entorno", missing }, { status: 500 });
  }

  const shop = shopDomain();
  if (!isValidShop(shop)) {
    return NextResponse.json(
      { error: "SHOPIFY_STORE_DOMAIN no es un dominio .myshopify.com", value: shop },
      { status: 500 },
    );
  }
  if ((process.env.SESSION_SECRET ?? "").length < 32) {
    return NextResponse.json(
      { error: "SESSION_SECRET debe tener al menos 32 caracteres" },
      { status: 500 },
    );
  }

  const redirectUri = new URL("/api/shopify/callback", request.url).toString();
  const state = await makeState(shop);
  return NextResponse.redirect(installUrl(shop, state, redirectUri));
}
