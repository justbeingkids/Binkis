/**
 * One-off migration: copy all codes from the legacy Google Sheets backend
 * into the Supabase `codes` table. Run from the project root:
 *
 *   npx tsx scripts/migrate-sheets-to-supabase.ts
 *
 * Requires: .env.local with BOTH the Google Sheets credentials AND the
 * Supabase credentials populated.
 *
 * Idempotent: uses upsert on the unique `code` column, so re-running is safe.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

const SHEETS_ID = process.env.GOOGLE_SHEETS_ID;
const SHEETS_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const SHEETS_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
const SHEETS_TAB = process.env.GOOGLE_SHEETS_TAB ?? "Codes";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function assertEnv(name: string, value: string | undefined): asserts value is string {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
}

interface SheetRow {
  code: string;
  generated_at: string;
  claimed: boolean;
  claimed_at: string | null;
  winner_name: string | null;
  winner_email: string | null;
  winner_phone: string | null;
  winner_address: string | null;
}

async function readAllSheetRows(): Promise<SheetRow[]> {
  assertEnv("GOOGLE_SHEETS_ID", SHEETS_ID);
  assertEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL", SHEETS_EMAIL);
  assertEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", SHEETS_KEY);

  const privateKey = SHEETS_KEY.replace(/\\n/g, "\n");
  const auth = new google.auth.JWT({
    email: SHEETS_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEETS_ID,
    range: `${SHEETS_TAB}!A2:H`,
  });

  const raw = res.data.values ?? [];
  const rows: SheetRow[] = [];
  for (const row of raw) {
    const code = (row[0] ?? "").toString().trim();
    if (!code) continue;
    rows.push({
      code,
      generated_at: (row[1] ?? "").toString(),
      claimed: ((row[2] ?? "").toString().toUpperCase() === "TRUE"),
      claimed_at: row[3] ? row[3].toString() : null,
      winner_name: row[4] ? row[4].toString() : null,
      winner_email: row[5] ? row[5].toString() : null,
      winner_phone: row[6] ? row[6].toString() : null,
      winner_address: row[7] ? row[7].toString() : null,
    });
  }
  return rows;
}

async function main() {
  assertEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
  assertEnv("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_KEY);

  console.log("Reading Google Sheets...");
  const rows = await readAllSheetRows();
  console.log(`Found ${rows.length} codes in Sheets.`);

  if (rows.length === 0) {
    console.log("Nothing to migrate. Exiting.");
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Verifying Supabase codes table exists...");
  const { error: probeErr } = await supabase
    .from("codes")
    .select("*", { count: "exact", head: true });
  if (probeErr) {
    console.error("Supabase probe failed. Did you run supabase/schema.sql in the dashboard?");
    console.error(probeErr.message);
    process.exit(1);
  }

  console.log("Migrating in batches of 500...");
  const batchSize = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize).map((r) => ({
      code: r.code,
      claimed: r.claimed,
      claimed_at: r.claimed_at,
      winner_name: r.winner_name,
      winner_email: r.winner_email,
      winner_phone: r.winner_phone,
      winner_address: r.winner_address,
    }));
    const { error } = await supabase
      .from("codes")
      .upsert(chunk, { onConflict: "code", ignoreDuplicates: false });
    if (error) {
      console.error(`Batch ${i} failed: ${error.message}`);
      process.exit(1);
    }
    inserted += chunk.length;
    console.log(`  upserted ${inserted}/${rows.length}`);
  }

  const { count, error: countErr } = await supabase
    .from("codes")
    .select("*", { count: "exact", head: true });
  if (countErr) {
    console.error(`Verification count failed: ${countErr.message}`);
    process.exit(1);
  }

  console.log(`\nMigration complete. Supabase now has ${count ?? "?"} rows in 'codes'.`);
  console.log("Note: lottery has NOT been run. All migrated codes have is_winner=false by default.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
