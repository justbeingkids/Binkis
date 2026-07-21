import { getAdminClient } from "./client";
import type { WinnerSubmission } from "@/types";

/**
 * Upsert the customer (by email) with their latest contact details and link the
 * winning code to them. Called at claim, once the winner's identity is known.
 * One customer can own many winning codes -> many characters. Returns the
 * customer id (or null if the RPC returned nothing).
 */
export async function linkCustomer(code: string, winner: WinnerSubmission): Promise<string | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase.rpc("link_customer", {
    p_code: code,
    p_email: winner.email,
    p_name: winner.name,
    p_phone: winner.phone,
    p_address: winner.address,
  });
  if (error) throw new Error(`link_customer failed: ${error.message}`);
  return (data as string) ?? null;
}

export interface CustomerRow {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  tier: string;
  createdAt: string;
  /** Number of winning codes this customer has claimed. */
  winCount: number;
  /** Character names for each claimed winning code (may repeat). */
  characters: string[];
}

type RawCustomer = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  tier: string;
  created_at: string;
  codes: Array<{ code: string; characters: { name: string } | null }> | null;
};

/** Every customer with their claimed winning codes + assigned characters. */
export async function getCustomers(): Promise<CustomerRow[]> {
  const supabase = getAdminClient();
  const pageSize = 1000;
  const rows: RawCustomer[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("customers")
      .select("id,email,name,phone,address,tier,created_at,codes(code,characters(name))")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`getCustomers failed: ${error.message}`);
    const batch = (data ?? []) as unknown as RawCustomer[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows.map((c) => {
    const codes = c.codes ?? [];
    return {
      id: c.id,
      email: c.email,
      name: c.name,
      phone: c.phone,
      address: c.address,
      tier: c.tier,
      createdAt: c.created_at,
      winCount: codes.length,
      characters: codes.map((x) => x.characters?.name).filter(Boolean) as string[],
    };
  });
}
