import { getAdminClient } from "./client";

export type AuditAction =
  | "login_success"
  | "login_failed"
  | "created"
  | "account_deleted"
  | "email_changed"
  | "password_changed"
  | "disabled"
  | "enabled";

export interface AuditEntry {
  id: string;
  ts: string;
  actorEmail: string | null;
  action: string;
  targetEmail: string | null;
  ip: string | null;
  country: string | null;
  city: string | null;
  detail: string | null;
}

/** Best-effort: never blocks the action if logging fails (e.g. table missing). */
export async function logAdminEvent(entry: {
  actorEmail: string;
  action: AuditAction;
  targetEmail: string;
  ip?: string;
  country?: string;
  city?: string;
  detail?: string;
}): Promise<void> {
  try {
    const supabase = getAdminClient();
    const { error } = await supabase.from("admin_audit_log").insert({
      actor_email: entry.actorEmail || null,
      action: entry.action,
      target_email: entry.targetEmail || null,
      ip: entry.ip || null,
      country: entry.country || null,
      city: entry.city || null,
      detail: entry.detail || null,
    });
    if (error) console.error("logAdminEvent failed:", error.message);
  } catch (err) {
    console.error("logAdminEvent threw:", err);
  }
}

export async function deleteAuditEntry(id: string): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase.from("admin_audit_log").delete().eq("id", id);
  if (error) throw new Error(`Supabase deleteAuditEntry failed: ${error.message}`);
}

export async function clearAuditLog(): Promise<void> {
  const supabase = getAdminClient();
  // Supabase requires a filter on delete; this one matches every real row.
  const { error } = await supabase
    .from("admin_audit_log")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw new Error(`Supabase clearAuditLog failed: ${error.message}`);
}

export async function listAuditLog(limit = 300): Promise<AuditEntry[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("*")
    .order("ts", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Supabase listAuditLog failed: ${error.message}`);
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id),
      ts: String(row.ts),
      actorEmail: (row.actor_email as string | null) ?? null,
      action: String(row.action),
      targetEmail: (row.target_email as string | null) ?? null,
      ip: (row.ip as string | null) ?? null,
      country: (row.country as string | null) ?? null,
      city: (row.city as string | null) ?? null,
      detail: (row.detail as string | null) ?? null,
    };
  });
}
