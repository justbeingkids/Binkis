import { getAdminClient } from "./client";

export interface AdminUser {
  id: string;
  email: string;
  passwordHash: string;
  disabled: boolean;
  createdAt: string | null;
}

export interface AdminUserSummary {
  id: string;
  email: string;
  disabled: boolean;
  createdAt: string | null;
}

interface DbAdminUserRow {
  id: string;
  email: string;
  password_hash: string;
  disabled?: boolean | null;
  created_at?: string | null;
}

function toUser(row: DbAdminUserRow): AdminUser {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    disabled: row.disabled === true,
    createdAt: row.created_at ?? null,
  };
}

const norm = (email: string) => email.trim().toLowerCase();

export async function findAdminUser(email: string): Promise<AdminUser | null> {
  const supabase = getAdminClient();
  // select("*") tolerates the `disabled` column not existing yet (pre-migration).
  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("email", norm(email))
    .maybeSingle();
  if (error) throw new Error(`Supabase findAdminUser failed: ${error.message}`);
  if (!data) return null;
  return toUser(data as DbAdminUserRow);
}

export async function findAdminUserById(id: string): Promise<AdminUser | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Supabase findAdminUserById failed: ${error.message}`);
  if (!data) return null;
  return toUser(data as DbAdminUserRow);
}

export async function listAdminUsers(): Promise<AdminUserSummary[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Supabase listAdminUsers failed: ${error.message}`);
  return (data ?? []).map((r) => {
    const row = r as DbAdminUserRow;
    return {
      id: row.id,
      email: row.email,
      disabled: row.disabled === true,
      createdAt: row.created_at ?? null,
    };
  });
}

export async function createAdminUser(
  email: string,
  passwordHash: string
): Promise<{ ok: boolean; reason?: "exists" | string }> {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("admin_users")
    .insert({ email: norm(email), password_hash: passwordHash });
  if (error) {
    if (error.code === "23505") return { ok: false, reason: "exists" };
    return { ok: false, reason: error.message };
  }
  return { ok: true };
}

export async function updateAdminUserEmail(
  id: string,
  newEmail: string
): Promise<{ ok: boolean; reason?: "exists" | string }> {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("admin_users")
    .update({ email: norm(newEmail) })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") return { ok: false, reason: "exists" };
    return { ok: false, reason: error.message };
  }
  return { ok: true };
}

export async function updateAdminUserPassword(id: string, passwordHash: string): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("admin_users")
    .update({ password_hash: passwordHash })
    .eq("id", id);
  if (error) throw new Error(`Supabase updateAdminUserPassword failed: ${error.message}`);
}

export async function setAdminUserDisabled(id: string, disabled: boolean): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase.from("admin_users").update({ disabled }).eq("id", id);
  if (error) throw new Error(`Supabase setAdminUserDisabled failed: ${error.message}`);
}

export async function deleteAdminUser(id: string): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase.from("admin_users").delete().eq("id", id);
  if (error) throw new Error(`Supabase deleteAdminUser failed: ${error.message}`);
}

export async function upsertAdminUser(email: string, passwordHash: string): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("admin_users")
    .upsert({ email: norm(email), password_hash: passwordHash }, { onConflict: "email" });
  if (error) throw new Error(`Supabase upsertAdminUser failed: ${error.message}`);
}
