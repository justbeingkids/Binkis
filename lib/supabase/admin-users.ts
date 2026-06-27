import { getAdminClient } from "./client";

export interface AdminUser {
  id: string;
  email: string;
  passwordHash: string;
}

interface DbAdminUserRow {
  id: string;
  email: string;
  password_hash: string;
}

export async function findAdminUser(email: string): Promise<AdminUser | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("id,email,password_hash")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (error) throw new Error(`Supabase findAdminUser failed: ${error.message}`);
  if (!data) return null;

  const row = data as DbAdminUserRow;
  return { id: row.id, email: row.email, passwordHash: row.password_hash };
}

export async function upsertAdminUser(email: string, passwordHash: string): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("admin_users")
    .upsert(
      { email: email.trim().toLowerCase(), password_hash: passwordHash },
      { onConflict: "email" }
    );
  if (error) throw new Error(`Supabase upsertAdminUser failed: ${error.message}`);
}
