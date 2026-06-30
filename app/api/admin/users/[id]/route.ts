import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin-auth";
import { isSuperAdmin } from "@/lib/admin-roles";
import {
  findAdminUserById,
  updateAdminUserEmail,
  updateAdminUserPassword,
  setAdminUserDisabled,
  deleteAdminUser,
} from "@/lib/supabase/admin-users";
import { hashPassword } from "@/lib/password";
import { logAdminEvent, type AuditAction } from "@/lib/supabase/audit-log";
import { extractGeo } from "@/lib/geo";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(4).optional(),
  disabled: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isSuperAdmin(session.sub)) return NextResponse.json({ error: "Solo el super admin" }, { status: 403 });

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos invalidos" }, { status: 400 });
  }

  const target = await findAdminUserById(id);
  if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  // Never let a super admin be disabled (lockout safety).
  if (parsed.data.disabled === true && isSuperAdmin(target.email)) {
    return NextResponse.json({ error: "No se puede deshabilitar al super admin" }, { status: 400 });
  }

  const geo = extractGeo(request);
  const actor = session.sub;
  const log = (action: AuditAction, targetEmail: string, detail?: string) =>
    logAdminEvent({
      actorEmail: actor,
      action,
      targetEmail,
      ip: geo.ip,
      country: geo.country,
      city: geo.city,
      detail,
    });

  if (typeof parsed.data.email === "string" && parsed.data.email.toLowerCase() !== target.email.toLowerCase()) {
    const r = await updateAdminUserEmail(id, parsed.data.email);
    if (!r.ok) {
      return NextResponse.json(
        { error: r.reason === "exists" ? "Ese correo ya existe" : "No se pudo cambiar el correo" },
        { status: r.reason === "exists" ? 409 : 500 }
      );
    }
    await log("email_changed", parsed.data.email.trim().toLowerCase(), `from ${target.email}`);
  }

  if (parsed.data.password) {
    await updateAdminUserPassword(id, hashPassword(parsed.data.password));
    await log("password_changed", target.email);
  }

  if (typeof parsed.data.disabled === "boolean" && parsed.data.disabled !== target.disabled) {
    await setAdminUserDisabled(id, parsed.data.disabled);
    await log(parsed.data.disabled ? "disabled" : "enabled", target.email);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isSuperAdmin(session.sub)) return NextResponse.json({ error: "Solo el super admin" }, { status: 403 });

  const { id } = await params;
  const target = await findAdminUserById(id);
  if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  if (isSuperAdmin(target.email)) {
    return NextResponse.json({ error: "No se puede eliminar al super admin" }, { status: 400 });
  }

  await deleteAdminUser(id);

  const geo = extractGeo(request);
  await logAdminEvent({
    actorEmail: session.sub,
    action: "account_deleted",
    targetEmail: target.email,
    ip: geo.ip,
    country: geo.country,
    city: geo.city,
  });

  return NextResponse.json({ ok: true });
}
