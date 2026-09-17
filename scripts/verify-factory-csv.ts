/**
 * Check a factory CSV against the database, before anything is handed out.
 *
 *   npx tsx scripts/verify-factory-csv.ts <file.csv>
 *   npx tsx scripts/verify-factory-csv.ts <file.csv> --mark-winners=4000
 *
 * The CSV is whatever went to the printer: one QR URL (or bare code) per line.
 * Every code on that sheet has to
 * exist in the database, and the ones handed out as winning holograms have to
 * be flagged as winners. This reports both, in file order, which is the order
 * the roll was printed in.
 *
 * --mark-winners=N flips the first N codes of the file to is_winner, and does
 * nothing unless --apply is also passed. It never un-flags anything and never
 * touches a claimed code.
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const CODE_PATTERN = /BNK-[A-Z2-9]{4}-[A-Z2-9]{4}/;
const CHUNK = 500;

interface Row {
  code: string;
  is_winner: boolean;
  claimed: boolean;
}

function codesFromCsv(path: string): string[] {
  const codes: string[] = [];
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = CODE_PATTERN.exec(line.toUpperCase());
    if (match) codes.push(match[0]);
  }
  return codes;
}

async function main() {
  const [file, ...flags] = process.argv.slice(2);
  if (!file) throw new Error("usage: verify-factory-csv.ts <file.csv> [--mark-winners=N] [--apply]");
  const markN = Number(/--mark-winners=(\d+)/.exec(flags.join(" "))?.[1] ?? 0);
  const apply = flags.includes("--apply");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const codes = codesFromCsv(file);
  const unique = [...new Set(codes)];
  console.log(`file: ${file}`);
  console.log(`codes in file: ${codes.length}  distinct: ${unique.length}`);

  const found = new Map<string, Row>();
  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    const { data, error } = await db.from("codes").select("code,is_winner,claimed").in("code", chunk);
    if (error) throw new Error(`lookup failed: ${error.message}`);
    for (const row of (data ?? []) as Row[]) found.set(row.code, row);
  }

  const missing = unique.filter((c) => !found.has(c));
  const notWinner = unique.filter((c) => found.get(c) && !found.get(c)!.is_winner);
  const claimed = unique.filter((c) => found.get(c)?.claimed);

  console.log(`in database:  ${found.size}`);
  console.log(`MISSING:      ${missing.length}${missing.length ? "  e.g. " + missing.slice(0, 5).join(", ") : ""}`);
  console.log(`not winners:  ${notWinner.length}${notWinner.length ? "  e.g. " + notWinner.slice(0, 5).join(", ") : ""}`);
  console.log(`already claimed: ${claimed.length}`);

  // Where the winners sit in the roll. If they are scattered, the first N
  // stickers off the roll are not the N winners, and handing out the first
  // boxes gives most buyers a "not a winner" on a sticker that says otherwise.
  const firstThousand = codes.slice(0, 1000).filter((c) => found.get(c)?.is_winner).length;
  console.log(`winners among the first 1,000 lines of the file: ${firstThousand}`);

  if (!markN) return;

  const target = codes.slice(0, markN).filter((c) => found.has(c) && !found.get(c)!.is_winner);
  console.log(`\n--mark-winners=${markN}: ${target.length} of the first ${markN} lines would be flagged`);
  if (!apply) {
    console.log("dry run. Re-run with --apply to write.");
    return;
  }
  for (let i = 0; i < target.length; i += CHUNK) {
    const chunk = target.slice(i, i + CHUNK);
    const { error } = await db
      .from("codes")
      .update({ is_winner: true })
      .in("code", chunk)
      .eq("claimed", false);
    if (error) throw new Error(`update failed: ${error.message}`);
    console.log(`flagged ${Math.min(i + CHUNK, target.length)}/${target.length}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
