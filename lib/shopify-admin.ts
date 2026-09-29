import { TIERS } from "@/lib/loyalty-tiers";
import { storedToken } from "@/lib/shopify-oauth";

/**
 * Writing level tags onto the Shopify customer.
 *
 * The theme blocks the Limited Edition button unless the customer carries
 * `elite-access` (30 points) or `vip-access` (40). Those tags are the store's
 * gate, so this side has to write them the moment the points are earned.
 *
 * Uses tagsAdd rather than reading the customer and writing the whole tag
 * list back. tagsAdd only ever appends, so it cannot drop a tag somebody else
 * set, and two orders landing at the same second cannot overwrite each other.
 * It is also idempotent, so re-running it costs a request and changes nothing.
 *
 * The token comes from installing the app on the store (see
 * lib/shopify-oauth.ts). SHOPIFY_ADMIN_TOKEN still wins when set, for a store
 * that can still issue a static one.
 */

const API_VERSION = "2025-01";

/** Tag per tier, matching what the theme reads in Liquid. */
const TIER_TAGS: Record<string, string> = {
  elite: "elite-access",
  founder: "vip-access",
};

export function tagsForPoints(points: number): string[] {
  return TIERS.filter((t) => points >= t.points)
    .map((t) => TIER_TAGS[t.key])
    .filter((tag): tag is string => Boolean(tag));
}

async function accessToken(): Promise<string | null> {
  return process.env.SHOPIFY_ADMIN_TOKEN || (await storedToken());
}

/** True when tags can actually be written: a shop and a token. */
export async function adminConfigured(): Promise<boolean> {
  return Boolean(process.env.SHOPIFY_STORE_DOMAIN) && Boolean(await accessToken());
}

/**
 * Add tags to one customer. Returns false when it could not be done, and
 * never throws: a failed tag must not fail the order that earned the points.
 */
export async function addCustomerTags(
  shopifyCustomerId: string,
  tags: string[],
): Promise<boolean> {
  if (tags.length === 0) return true;

  const domain = process.env.SHOPIFY_STORE_DOMAIN ?? "";
  const token = await accessToken();
  if (!domain || !token) {
    console.warn("no Shopify admin token yet: skipping customer tags");
    return false;
  }
  const query = `
    mutation addTags($id: ID!, $tags: [String!]!) {
      tagsAdd(id: $id, tags: $tags) {
        userErrors { field message }
      }
    }`;

  try {
    const res = await fetch(`https://${domain}/admin/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({
        query,
        variables: { id: `gid://shopify/Customer/${shopifyCustomerId}`, tags },
      }),
    });

    if (!res.ok) {
      console.error(`tagsAdd HTTP ${res.status} for customer ${shopifyCustomerId}`);
      return false;
    }
    const body = (await res.json()) as {
      errors?: unknown;
      data?: { tagsAdd?: { userErrors?: { message: string }[] } };
    };
    const userErrors = body.data?.tagsAdd?.userErrors ?? [];
    if (body.errors || userErrors.length > 0) {
      console.error("tagsAdd rejected:", JSON.stringify(body.errors ?? userErrors));
      return false;
    }
    return true;
  } catch (err) {
    console.error("tagsAdd failed:", err);
    return false;
  }
}
