import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";
import { verifySession, type SessionPayload } from "@/lib/session";

export const ADMIN_COOKIE_NAME = "binkis_admin_auth";

/**
 * Reads and verifies the admin session cookie. Returns the session payload
 * (which includes the admin's email as `sub`) or null when absent/invalid/expired.
 * Server-only (uses next/headers cookies()).
 */
export async function getAdminSession(): Promise<SessionPayload | null> {
  const env = getServerEnv();
  const store = await cookies();
  const value = store.get(ADMIN_COOKIE_NAME)?.value;
  if (!value) return null;
  return verifySession(value, env.SESSION_SECRET);
}

export async function isAdminAuthed(): Promise<boolean> {
  return (await getAdminSession()) !== null;
}

export function adminCookieOptions() {
  // No maxAge/expires => a session cookie: the browser deletes it on close.
  // The token itself also carries a 1-hour expiry (SESSION_TTL_MS), so the
  // session ends at browser-close OR 1 hour, whichever comes first.
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}
