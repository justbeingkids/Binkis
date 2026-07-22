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

export interface LoyaltyAccountRow {
  email: string;
  points: number;
  updatedAt: string;
}

/** Every loyalty account (highest balance first), paginated past the 1k cap. */
export async function getLoyaltyAccounts(): Promise<LoyaltyAccountRow[]> {
  const supabase = getAdminClient();
  const pageSize = 1000;
  const rows: LoyaltyAccountRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("loyalty_accounts")
      .select("email,points,updated_at")
      .order("points", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`getLoyaltyAccounts failed: ${error.message}`);
    const batch = (data ?? []) as Array<{ email: string; points: number; updated_at: string }>;
    rows.push(
      ...batch.map((r) => ({ email: r.email, points: Number(r.points), updatedAt: r.updated_at }))
    );
    if (batch.length < pageSize) break;
  }
  return rows;
}
