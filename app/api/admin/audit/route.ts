import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { isSuperAdmin } from "@/lib/admin-roles";
import { listAuditLog } from "@/lib/supabase/audit-log";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isSuperAdmin(session.sub)) return NextResponse.json({ error: "Solo el super admin" }, { status: 403 });

  const entries = await listAuditLog();
  return NextResponse.json({ entries });
}
