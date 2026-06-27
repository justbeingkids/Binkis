import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Password hashing with scrypt (Node crypto, no external dependency).
 *
 * Stored format is self-contained so verification needs no separate config:
 *   scrypt$<N>$<r>$<p>$<salt-base64>$<hash-base64>
 *
 * NOTE: scryptSync is Node-only. Import this module ONLY from Node runtimes
 * (API routes, scripts) — never from middleware (Edge runtime).
 */

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEYLEN, { N, r: R, p: P });
  return ["scrypt", N, R, P, salt.toString("base64"), derived.toString("base64")].join("$");
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4], "base64");
    expected = Buffer.from(parts[5], "base64");
  } catch {
    return false;
  }
  if (expected.length === 0) return false;

  const derived = scryptSync(password, salt, expected.length, { N: n, r, p });
  // timingSafeEqual requires equal-length buffers; lengths match by construction.
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
