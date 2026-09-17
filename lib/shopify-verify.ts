import { createHmac, timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Webhook: base64 HMAC-SHA256 of the raw body, in X-Shopify-Hmac-Sha256. */
export function verifyWebhook(rawBody: string, header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  return safeEqual(digest, header);
}

/**
 * App Proxy: hex HMAC-SHA256 over the query params minus `signature`, sorted
 * by key, each written key=value (repeated keys joined by commas), with no
 * separator between pairs. Also refuses requests older than five minutes.
 */
export function verifyAppProxy(params: URLSearchParams, secret: string, now = Date.now()): boolean {
  const signature = params.get("signature");
  if (!signature || !secret) return false;

  const grouped = new Map<string, string[]>();
  for (const [k, v] of params) {
    if (k === "signature") continue;
    grouped.set(k, [...(grouped.get(k) ?? []), v]);
  }
  const message = [...grouped.keys()]
    .sort()
    .map((k) => `${k}=${grouped.get(k)!.join(",")}`)
    .join("");
  const digest = createHmac("sha256", secret).update(message, "utf8").digest("hex");
  if (!safeEqual(digest, signature)) return false;

  const ts = Number(params.get("timestamp"));
  return Number.isFinite(ts) && Math.abs(now / 1000 - ts) <= 300;
}

/** Server-to-server key, sent as `Authorization: Bearer <key>`. */
export function verifyBearer(header: string | null, key: string | undefined): boolean {
  if (!header || !key || key.length < 32) return false;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return Boolean(match) && safeEqual(match![1], key);
}
