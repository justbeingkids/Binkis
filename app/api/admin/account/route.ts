import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, ADMIN_COOKIE_NAME, adminCookieOptions } from "@/lib/admin-auth";
import { getServerEnv } from "@/lib/env";
import { findAdminUser, updateAdminUserEmail, updateAdminUserPassword } from "@/lib/supabase/admin-users";
import { verifyPassword, hashPassword } from "@/lib/password";
import { signSession, SESSION_TTL_MS } from "@/lib/session";
import { logAdminEvent } from "@/lib/supabase/audit-log";
import { clientIp } from "@/lib/client-ip";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const schema = z.object({
  currentEmail: z.string().email("Correo actual invalido"),
  currentPassword: z.string().min(1, "Password actual requerido"),
  newEmail: z.string().optional(),
  newPassword: z.string().optional(),
});

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json({ email: session.sub });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos invalidos" }, { status: 400 });
  }

  const { currentEmail, currentPassword } = parsed.data;
  const newEmail = (parsed.data.newEmail ?? "").trim();
  const newPassword = parsed.data.newPassword ?? "";

  // Re-authenticate against the currently logged-in account.
  const user = await findAdminUser(session.sub);
  if (!user) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

  const reauthOk =
    currentEmail.trim().toLowerCase() === user.email.toLowerCase() &&
    verifyPassword(currentPassword, user.passwordHash);
  if (!reauthOk) {
    return NextResponse.json({ error: "Correo o password actual incorrecto" }, { status: 401 });
  }

  // Verify-only (unlocks the edit form on the page).
  if (!newEmail && !newPassword) {
    return NextResponse.json({ ok: true, verified: true, email: user.email });
  }

  const ip = clientIp(request);
  let finalEmail = user.email;

  if (newEmail && newEmail.toLowerCase() !== user.email.toLowerCase()) {
    if (!EMAIL_RE.test(newEmail)) {
      return NextResponse.json({ error: "Nuevo correo invalido" }, { status: 400 });
    }
    const r = await updateAdminUserEmail(user.id, newEmail);
    if (!r.ok) {
      return NextResponse.json(
        { error: r.reason === "exists" ? "Ese correo ya esta en uso" : "No se pudo cambiar el correo" },
        { status: r.reason === "exists" ? 409 : 500 }
      );
    }
    finalEmail = newEmail.toLowerCase();
    await logAdminEvent({
      actorEmail: user.email,
      action: "email_changed",
      targetEmail: finalEmail,
      ip,
      detail: `from ${user.email}`,
    });
  }

  if (newPassword) {
    if (newPassword.length < 4) {
      return NextResponse.json({ error: "El nuevo password debe tener al menos 4 caracteres" }, { status: 400 });
    }
    await updateAdminUserPassword(user.id, hashPassword(newPassword));
    await logAdminEvent({ actorEmail: user.email, action: "password_changed", targetEmail: finalEmail, ip });
  }

  const res = NextResponse.json({ ok: true, email: finalEmail });

  // If the email changed, the session subject is now stale — re-issue it.
  if (finalEmail !== user.email) {
    const env = getServerEnv();
    const token = await signSession(
      { sub: finalEmail, exp: Date.now() + SESSION_TTL_MS },
      env.SESSION_SECRET
    );
    res.cookies.set(ADMIN_COOKIE_NAME, token, adminCookieOptions());
  }
  return res;
}
