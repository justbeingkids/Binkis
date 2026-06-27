/**
 * Create or update an admin user in the Supabase `admin_users` table.
 *
 * Usage (from project root):
 *   npm run seed-admin -- <email> <password>
 *   npm run seed-admin                      # defaults to test@gmail.com / test
 *
 * Requires .env.local with the Supabase credentials populated.
 * Idempotent: upserts on the unique `email` column, so re-running updates
 * the password for an existing user instead of erroring.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { hashPassword } from "../lib/password";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function assertEnv(name: string, value: string | undefined): asserts value is string {
  if (!value) throw new Error(`Missing required env var: ${name}`);
}

async function main() {
  assertEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
  assertEnv("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_KEY);

  const email = (process.argv[2] ?? "test@gmail.com").trim().toLowerCase();
  const password = process.argv[3] ?? "test";

  if (!email.includes("@")) throw new Error(`Invalid email: ${email}`);
  if (password.length < 1) throw new Error("Password must not be empty");

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const password_hash = hashPassword(password);

  const { error } = await supabase
    .from("admin_users")
    .upsert({ email, password_hash }, { onConflict: "email" });

  if (error) {
    console.error("Failed to seed admin user. Did you run supabase/schema.sql first?");
    console.error(error.message);
    process.exit(1);
  }

  console.log(`Admin user ready: ${email}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
