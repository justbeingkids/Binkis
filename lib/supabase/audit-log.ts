import { getAdminClient } from "./client";

export type AuditAction =
  | "created"
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
  detail: string | null;
}

/** Best-effort: never blocks the action if logging fails. */
export async function logAdminEvent(entry: {
  actorEmail: string;
  action: AuditAction;
  targetEmail: string;
  ip?: string;
  detail?: string;
}): Promise<void> {
  try {
    const supabase = getAdminClient();
    const { error } = await supabase.from("admin_audit_log").insert({
      actor_email: entry.actorEmail || null,
      action: entry.action,
      target_email: entry.targetEmail || null,
      ip: entry.ip || null,
      detail: entry.detail || null,
    });
    if (error) console.error("logAdminEvent failed:", error.message);
  } catch (err) {
    console.error("logAdminEvent threw:", err);
  }
}

export async function listAuditLog(limit = 200): Promise<AuditEntry[]> {
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
      detail: (row.detail as string | null) ?? null,
    };
  });
}
