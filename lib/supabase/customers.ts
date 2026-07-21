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
