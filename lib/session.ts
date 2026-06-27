/**
 * Stateless signed session tokens for the admin gate.
 *
 * Token shape:  base64url(payload).base64url(HMAC-SHA256(payload, secret))
 * Payload:      { sub: <email>, exp: <epoch ms> }
 *
 * Uses Web Crypto (globalThis.crypto.subtle), which is available in BOTH the
 * Node runtime (API routes, server components) and the Edge runtime
 * (middleware), so the same verify logic runs everywhere.
 */

export interface SessionPayload {
  sub: string;
  exp: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/** Default session lifetime: 7 days. */
export const SESSION_TTL_MS = 60 * 60 * 24 * 7 * 1000;

export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return `${body}.${bytesToBase64Url(new Uint8Array(sig))}`;
}

/** Returns the payload if the signature is valid and the token is unexpired, else null. */
export async function verifySession(token: string, secret: string): Promise<SessionPayload | null> {
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;

  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  let sigBytes: Uint8Array<ArrayBuffer>;
  try {
    sigBytes = base64UrlToBytes(signature);
  } catch {
    return null;
  }

  const key = await importKey(secret);
  const valid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(body));
  if (!valid) return null;

  try {
    const payload = JSON.parse(decoder.decode(base64UrlToBytes(body))) as SessionPayload;
    if (typeof payload.sub !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
