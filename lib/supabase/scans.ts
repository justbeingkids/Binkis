import { getAdminClient } from "./client";

export interface ScanEntry {
  /** The scanned code as received (may be an invalid format). */
  code: string;
  /** Public result returned to the UI: 'valid' | 'claimed' | 'invalid'. */
  result: string;
  /** Winner flag when the code exists; null for not-found / bad-format scans. */
  isWinner: boolean | null;
  /** Whether the code exists in the database at all. */
  codeExists: boolean;
  ip: string;
  country: string;
  region: string;
  city: string;
  userAgent: string;
}

/**
 * Append one row to scan_requests for a public code validation — recorded for
 * EVERY scan, winner or not. Never collects personal data (that lives on the
 * codes row only when a winner claims). Throws on failure; callers that must
 * not break the user response should wrap this in try/catch.
 */
export async function recordScan(entry: ScanEntry): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase.from("scan_requests").insert({
    code: entry.code || null,
    result: entry.result,
    is_winner: entry.isWinner,
    code_exists: entry.codeExists,
    ip: entry.ip || null,
    country: entry.country || null,
    region: entry.region || null,
    city: entry.city || null,
    user_agent: entry.userAgent || null,
  });
  if (error) {
    throw new Error(`Supabase recordScan failed: ${error.message}`);
  }
}

export interface ScanRequest {
  id: string;
  code: string | null;
  result: string;
  isWinner: boolean | null;
  codeExists: boolean;
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  userAgent: string | null;
  createdAt: string;
}

/** Most recent scans first, capped at `limit` (newest window for the admin log). */
export async function getRecentScans(limit = 1000): Promise<ScanRequest[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("scan_requests")
    .select("id,code,result,is_winner,code_exists,ip,country,region,city,user_agent,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Supabase getRecentScans failed: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    code: row.code,
    result: row.result,
    isWinner: row.is_winner,
    codeExists: row.code_exists,
    ip: row.ip,
    country: row.country,
    region: row.region,
    city: row.city,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  }));
}
