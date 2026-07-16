import { getAdminClient } from "./client";
import type { CodeMetrics, CodeRecord } from "@/types";

interface DbCodeRow {
  code: string;
  is_winner: boolean;
  claimed: boolean;
  claimed_at: string | null;
  winner_name: string | null;
  winner_email: string | null;
  winner_phone: string | null;
  winner_address: string | null;
  created_at: string;
  // Present only when the query embeds the character relationship.
  characters?: { name: string } | { name: string }[] | null;
}

/** Normalize an embedded character (Supabase may return an object or a 1-row array). */
function characterName(row: DbCodeRow): string | null {
  const c = row.characters;
  if (!c) return null;
  if (Array.isArray(c)) return c[0]?.name ?? null;
  return c.name ?? null;
}

function rowToRecord(row: DbCodeRow): CodeRecord {
  return {
    code: row.code,
    isWinner: row.is_winner,
    generatedAt: row.created_at,
    claimed: row.claimed,
    claimedAt: row.claimed_at,
    winnerName: row.winner_name,
    winnerEmail: row.winner_email,
    winnerPhone: row.winner_phone,
    winnerAddress: row.winner_address,
    characterName: characterName(row),
  };
}

export async function getAllCodes(): Promise<CodeRecord[]> {
  const supabase = getAdminClient();
  const all: CodeRecord[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("codes")
      .select(
        "code,is_winner,claimed,claimed_at,winner_name,winner_email,winner_phone,winner_address,created_at,characters(name)"
      )
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Supabase getAllCodes failed: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const row of data) all.push(rowToRecord(row as DbCodeRow));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

export async function getAllCodeStrings(): Promise<string[]> {
  const supabase = getAdminClient();
  const codes: string[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("codes")
      .select("code")
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Supabase getAllCodeStrings failed: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const row of data) codes.push(row.code as string);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return codes;
}

export async function appendCodes(codes: string[]): Promise<void> {
  if (codes.length === 0) return;
  const supabase = getAdminClient();

  const batchSize = 500;
  for (let i = 0; i < codes.length; i += batchSize) {
    const chunk = codes.slice(i, i + batchSize).map((code) => ({ code }));
    const { error } = await supabase.from("codes").insert(chunk);
    if (error) {
      throw new Error(`Supabase appendCodes failed at batch ${i}: ${error.message}`);
    }
  }
}

export async function findCode(code: string): Promise<CodeRecord | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("codes")
    .select("code,is_winner,claimed,claimed_at,winner_name,winner_email,winner_phone,winner_address,created_at")
    .eq("code", code)
    .maybeSingle();

  if (error) throw new Error(`Supabase findCode failed: ${error.message}`);
  if (!data) return null;
  return rowToRecord(data as DbCodeRow);
}

/**
 * Claim a code. `justClaimed` is true only when THIS call flipped the code from
 * unclaimed to claimed (used to award one-time side effects like loyalty points
 * exactly once, even on re-submits or concurrent requests).
 */
export async function markCodeClaimed(
  code: string,
  winner: { name: string; email: string; phone: string; address: string }
): Promise<{ record: CodeRecord; justClaimed: boolean } | null> {
  const supabase = getAdminClient();
  const existing = await findCode(code);
  if (!existing) return null;
  if (existing.claimed) return { record: existing, justClaimed: false };
  if (!existing.isWinner) return { record: existing, justClaimed: false };

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("codes")
    .update({
      claimed: true,
      claimed_at: now,
      winner_name: winner.name,
      winner_email: winner.email,
      winner_phone: winner.phone,
      winner_address: winner.address,
    })
    .eq("code", code)
    .eq("claimed", false)
    .select("code,is_winner,claimed,claimed_at,winner_name,winner_email,winner_phone,winner_address,created_at")
    .maybeSingle();

  if (error) throw new Error(`Supabase markCodeClaimed failed: ${error.message}`);
  if (!data) {
    // Lost the race: another request claimed it between findCode and update.
    const fresh = await findCode(code);
    return fresh ? { record: fresh, justClaimed: false } : null;
  }
  return { record: rowToRecord(data as DbCodeRow), justClaimed: true };
}

export async function getMetrics(): Promise<CodeMetrics> {
  const supabase = getAdminClient();

  const [totalGen, totalWin, totalClaimed, latest] = await Promise.all([
    supabase.from("codes").select("*", { count: "exact", head: true }),
    supabase.from("codes").select("*", { count: "exact", head: true }).eq("is_winner", true),
    supabase
      .from("codes")
      .select("*", { count: "exact", head: true })
      .eq("is_winner", true)
      .eq("claimed", true),
    supabase
      .from("codes")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (totalGen.error) throw new Error(`Metrics (total) failed: ${totalGen.error.message}`);
  if (totalWin.error) throw new Error(`Metrics (winners) failed: ${totalWin.error.message}`);
  if (totalClaimed.error) throw new Error(`Metrics (claimed) failed: ${totalClaimed.error.message}`);

  const totalGenerated = totalGen.count ?? 0;
  const totalWinners = totalWin.count ?? 0;
  const totalClaimedCount = totalClaimed.count ?? 0;

  return {
    totalGenerated,
    totalWinners,
    totalClaimed: totalClaimedCount,
    totalAvailable: totalWinners - totalClaimedCount,
    claimRate: totalWinners === 0 ? 0 : totalClaimedCount / totalWinners,
    latestGeneratedAt: latest.data?.created_at ?? null,
  };
}

export function computeMetrics(records: CodeRecord[]): CodeMetrics {
  const totalGenerated = records.length;
  const winners = records.filter((r) => r.isWinner);
  const totalWinners = winners.length;
  const totalClaimed = winners.filter((r) => r.claimed).length;
  const latest = records.reduce<string | null>((acc, r) => {
    if (!acc) return r.generatedAt || null;
    return r.generatedAt > acc ? r.generatedAt : acc;
  }, null);

  return {
    totalGenerated,
    totalWinners,
    totalClaimed,
    totalAvailable: totalWinners - totalClaimed,
    claimRate: totalWinners === 0 ? 0 : totalClaimed / totalWinners,
    latestGeneratedAt: latest,
  };
}

interface DailyBuckets {
  generated: number[];
  claimed: number[];
  cumulative: number[];
  dayLabels: string[];
}

export function buildDailySeries(records: CodeRecord[], days = 7): DailyBuckets {
  const now = new Date();
  const buckets: { key: string; label: string }[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.push({ key, label: key.slice(5) });
  }

  const generated = new Array(days).fill(0) as number[];
  const claimed = new Array(days).fill(0) as number[];

  for (const r of records) {
    if (r.generatedAt) {
      const k = r.generatedAt.slice(0, 10);
      const idx = buckets.findIndex((b) => b.key === k);
      if (idx >= 0) generated[idx] += 1;
    }
    if (r.claimedAt) {
      const k = r.claimedAt.slice(0, 10);
      const idx = buckets.findIndex((b) => b.key === k);
      if (idx >= 0) claimed[idx] += 1;
    }
  }

  const cumulative: number[] = [];
  let running = records.length - generated.reduce((a, b) => a + b, 0);
  for (const g of generated) {
    running += g;
    cumulative.push(running);
  }

  return {
    generated,
    claimed,
    cumulative,
    dayLabels: buckets.map((b) => b.label),
  };
}

/**
 * Lottery: randomly select `winnerCount` codes from currently-not-winner codes
 * and flip them to is_winner = true. Idempotent-ish: if winners already exist,
 * it tops up to reach the desired count (or no-op if already at/above).
 */
export async function runLottery(winnerCount: number): Promise<{
  selected: number;
  alreadyWinners: number;
  remainingAvailable: number;
}> {
  const supabase = getAdminClient();

  const { count: existingWinners, error: countErr } = await supabase
    .from("codes")
    .select("*", { count: "exact", head: true })
    .eq("is_winner", true);

  if (countErr) throw new Error(`Lottery (count winners) failed: ${countErr.message}`);

  const already = existingWinners ?? 0;
  if (already >= winnerCount) {
    return { selected: 0, alreadyWinners: already, remainingAvailable: 0 };
  }

  const need = winnerCount - already;

  const candidates: string[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("codes")
      .select("code")
      .eq("is_winner", false)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Lottery (load candidates) failed: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const r of data) candidates.push(r.code as string);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  if (candidates.length < need) {
    throw new Error(
      `Not enough candidates for lottery: need ${need}, have ${candidates.length}. Generate more codes first.`
    );
  }

  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const picked = candidates.slice(0, need);

  const batchSize = 500;
  for (let i = 0; i < picked.length; i += batchSize) {
    const chunk = picked.slice(i, i + batchSize);
    const { error } = await supabase
      .from("codes")
      .update({ is_winner: true })
      .in("code", chunk);
    if (error) throw new Error(`Lottery (update) failed at batch ${i}: ${error.message}`);
  }

  return {
    selected: picked.length,
    alreadyWinners: already,
    remainingAvailable: candidates.length - picked.length,
  };
}
