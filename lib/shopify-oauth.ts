import { getAdminClient } from "@/lib/supabase/client";
export { verifyOauthCallback } from "@/lib/shopify-verify";
import { signSession, verifySession } from "@/lib/session";

/**
 * Installing the app on the store, to get an Admin API token.
 *
 * Shopify removed the legacy custom apps that handed out a static shpat_
 * token, so the only way to write customer tags is to install an app properly
 * and keep the token it returns. This is the smallest correct version of that:
 * one store, one token, no app store, no billing, no embedded UI.
 *
 * Two things do the security work. Shopify signs the callback, so nobody can
 * hand us a token by calling the endpoint themselves; and the shop is pinned
 * to SHOPIFY_STORE_DOMAIN, so a signed callback for somebody else's store is
 * refused rather than stored.
 */

const SCOPES = "write_customers,read_customers";
const INSTALL_TTL_MS = 30 * 60 * 1000;

export function shopDomain(): string {
  return (process.env.SHOPIFY_STORE_DOMAIN ?? "").trim().toLowerCase();
}

export function isValidShop(shop: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop);
}

function stateSecret(): string {
  const secret = process.env.SESSION_SECRET ?? "";
  if (secret.length < 32) throw new Error("SESSION_SECRET is required to sign the install state");
  return secret;
}

/**
 * The state carries its own signature and expiry, rather than living in a
 * cookie: whoever generates the install link is not the person who opens it.
 */
export async function makeState(shop: string): Promise<string> {
  return signSession({ sub: `install:${shop}`, exp: Date.now() + INSTALL_TTL_MS }, stateSecret());
}

export async function checkState(state: string, shop: string): Promise<boolean> {
  const payload = await verifySession(state, stateSecret());
  return payload?.sub === `install:${shop}`;
}

export function installUrl(shop: string, state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.SHOPIFY_OAUTH_CLIENT_ID ?? "",
    scope: SCOPES,
    redirect_uri: redirectUri,
    state,
  });
  return `https://${shop}/admin/oauth/authorize?${params}`;
}

export async function exchangeCode(shop: string, code: string): Promise<{ token: string; scope: string } | null> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_OAUTH_CLIENT_ID,
      client_secret: process.env.SHOPIFY_OAUTH_CLIENT_SECRET,
      code,
    }),
  });
  if (!res.ok) {
    console.error(`token exchange failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
    return null;
  }
  const body = (await res.json()) as { access_token?: string; scope?: string };
  if (!body.access_token) return null;
  return { token: body.access_token, scope: body.scope ?? "" };
}

export async function saveToken(shop: string, token: string, scope: string): Promise<void> {
  const { error } = await getAdminClient()
    .from("shopify_oauth_tokens")
    .upsert({ shop, access_token: token, scope, installed_at: new Date().toISOString() });
  if (error) throw new Error(`saving the Shopify token failed: ${error.message}`);
}

/** Cached briefly: every awarded order reads this, and it changes at install. */
let cached: { token: string; at: number } | null = null;
const CACHE_MS = 60_000;

export async function storedToken(): Promise<string | null> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.token;

  const { data, error } = await getAdminClient()
    .from("shopify_oauth_tokens")
    .select("access_token")
    .eq("shop", shopDomain())
    .maybeSingle();
  if (error) {
    console.error("reading the Shopify token failed:", error.message);
    return null;
  }
  const token = (data as { access_token: string } | null)?.access_token ?? null;
  if (token) cached = { token, at: Date.now() };
  return token;
}
