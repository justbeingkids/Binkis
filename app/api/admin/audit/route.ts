import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { isSuperAdmin } from "@/lib/admin-roles";
import { listAuditLog, clearAuditLog } from "@/lib/supabase/audit-log";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const isSuper = isSuperAdmin(session.sub);
  const all = await listAuditLog();

  // Regular admins can see everything EXCEPT entries that involve the super
  // admin (as actor or target). The super admin sees all.
  const entries = isSuper
    ? all
    : all.filter((e) => !isSuperAdmin(e.actorEmail) && !isSuperAdmin(e.targetEmail));

  return NextResponse.json({ entries, canDelete: isSuper });
}

// Clear the entire activity log. Super admin only.
export async function DELETE() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isSuperAdmin(session.sub)) return NextResponse.json({ error: "Solo el super admin" }, { status: 403 });

  await clearAuditLog();
  return NextResponse.json({ ok: true });
}
