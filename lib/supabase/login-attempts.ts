import { getAdminClient } from "./client";

/**
 * Per-IP failed-login throttle. After consecutive failures the caller must
 * wait an escalating cooldown before retrying:
 *   1st failure -> 5s, 2nd -> 10s, 3rd and beyond -> 30s.
 * A successful login clears the record.
 *
 * All functions FAIL OPEN: if the login_attempts table is missing or the DB
 * errors, they behave as "no lock" so admin login never breaks. Throttling
 * simply activates once the table exists.
 */

const COOLDOWN_SECONDS = [5, 10, 30] as const;

export function cooldownFor(failCount: number): number {
  if (failCount <= 0) return 0;
  if (failCount === 1) return COOLDOWN_SECONDS[0];
  if (failCount === 2) return COOLDOWN_SECONDS[1];
  return COOLDOWN_SECONDS[2];
}

/** Seconds the key must still wait before another attempt, or 0 if not locked. */
export async function getLockRemaining(key: string): Promise<number> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("login_attempts")
    .select("fail_count,last_failed_at")
    .eq("id", key)
    .maybeSingle();

  if (error || !data) return 0;

  const failCount = (data.fail_count as number) ?? 0;
  const cooldown = cooldownFor(failCount);
  if (cooldown <= 0) return 0;

  const last = new Date(data.last_failed_at as string).getTime();
  if (!Number.isFinite(last)) return 0;

  const remaining = Math.ceil((last + cooldown * 1000 - Date.now()) / 1000);
  return remaining > 0 ? remaining : 0;
}

/** Records a failed attempt; returns the cooldown (seconds) the key must now wait. */
export async function recordFailure(key: string): Promise<number> {
  const supabase = getAdminClient();

  const { data } = await supabase
    .from("login_attempts")
    .select("fail_count")
    .eq("id", key)
    .maybeSingle();

  const nextCount = (((data?.fail_count as number) ?? 0) + 1);

  const { error } = await supabase
    .from("login_attempts")
    .upsert(
      { id: key, fail_count: nextCount, last_failed_at: new Date().toISOString() },
      { onConflict: "id" }
    );

  if (error) return 0; // fail open
  return cooldownFor(nextCount);
}

/** Clears the throttle for a key (call on successful login). */
export async function clearAttempts(key: string): Promise<void> {
  const supabase = getAdminClient();
  await supabase.from("login_attempts").delete().eq("id", key);
}
