import { getAdminClient } from "./client";
import { logAdminEvent } from "./audit-log";

/**
 * Per-IP throttle on the public claim endpoint.
 *
 * A winning code is the whole secret: whoever types it gets the prize. The
 * codes were printed from a plaintext file that travelled by email, so the
 * realistic abuse is not guessing, it is someone walking that list from one
 * machine. Ten claims an hour is far above what a person with a hologram in
 * their hand ever does, and far below what walking a list requires.
 */
export const MAX_CLAIMS_PER_HOUR = 10;
const WINDOW_MS = 60 * 60 * 1000;

export interface ThrottleVerdict {
  blocked: boolean;
  attempts: number;
  retryAfterSeconds: number;
}

export async function checkClaimThrottle(ip: string): Promise<ThrottleVerdict> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { data, error } = await getAdminClient()
    .from("claim_attempts")
    .select("created_at")
    .eq("ip", ip)
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  // Never fail closed on a throttle lookup: a winner holding a real hologram
  // must not be turned away because the counter could not be read.
  if (error) {
    console.error("checkClaimThrottle failed:", error.message);
    return { blocked: false, attempts: 0, retryAfterSeconds: 0 };
  }

  const rows = (data ?? []) as { created_at: string }[];
  if (rows.length < MAX_CLAIMS_PER_HOUR) {
    return { blocked: false, attempts: rows.length, retryAfterSeconds: 0 };
  }

  const oldest = new Date(rows[0].created_at).getTime();
  const retryAfterSeconds = Math.max(1, Math.ceil((oldest + WINDOW_MS - Date.now()) / 1000));
  return { blocked: true, attempts: rows.length, retryAfterSeconds };
}

export async function recordClaimAttempt(ip: string, code: string, succeeded: boolean): Promise<void> {
  const { error } = await getAdminClient()
    .from("claim_attempts")
    .insert({ ip, code: code.slice(0, 64), succeeded });
  if (error) console.error("recordClaimAttempt failed:", error.message);
}

/**
 * The alert half of "limit and alert". There is no mail service wired up here,
 * so the alert lands in the audit log the admin already reads, with the IP and
 * the count, which is what someone would need to act on it.
 */
export async function reportClaimFlood(ip: string, attempts: number, code: string): Promise<void> {
  await logAdminEvent({
    actorEmail: "",
    action: "claim_rate_limited",
    targetEmail: "",
    ip,
    detail: `${attempts} intentos de reclamo en una hora desde ${ip}, ultimo codigo ${code}`,
  });
}
