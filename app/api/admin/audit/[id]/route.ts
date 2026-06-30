import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { isSuperAdmin } from "@/lib/admin-roles";
import { deleteAuditEntry } from "@/lib/supabase/audit-log";

export const dynamic = "force-dynamic";

// Delete a single log entry. Super admin only.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isSuperAdmin(session.sub)) return NextResponse.json({ error: "Solo el super admin" }, { status: 403 });

  const { id } = await params;
  await deleteAuditEntry(id);
  return NextResponse.json({ ok: true });
}
