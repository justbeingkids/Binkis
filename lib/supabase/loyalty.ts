import { getAdminClient } from "./client";

/** Add (or subtract) points for a customer; returns the new balance. */
export async function addPoints(email: string, delta: number, reason: string): Promise<number> {
  const supabase = getAdminClient();
  const { data, error } = await supabase.rpc("add_loyalty_points", {
    p_email: email,
    p_delta: Math.trunc(delta),
    p_reason: reason,
  });
  if (error) throw new Error(`add_loyalty_points failed: ${error.message}`);
  return Number(data ?? 0);
}

export async function getBalance(email: string): Promise<number> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("loyalty_accounts")
    .select("points")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (error) throw new Error(`getBalance failed: ${error.message}`);
  return data ? Number((data as { points: number }).points) : 0;
}
