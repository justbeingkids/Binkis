import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE_NAME, adminCookieOptions } from "@/lib/admin-auth";
import { getServerEnv } from "@/lib/env";
import { findAdminUser } from "@/lib/supabase/admin-users";
import { verifyPassword } from "@/lib/password";
import { signSession, SESSION_TTL_MS } from "@/lib/session";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().email("Correo invalido"),
  password: z.string().min(1, "Password requerido"),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos invalidos" },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;

  try {
    const user = await findAdminUser(email);
    // Same response for unknown email and wrong password — don't leak which.
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Correo o password incorrecto" }, { status: 401 });
    }

    const env = getServerEnv();
    const token = await signSession(
      { sub: user.email, exp: Date.now() + SESSION_TTL_MS },
      env.SESSION_SECRET
    );

    const res = NextResponse.json({ ok: true, email: user.email });
    res.cookies.set(ADMIN_COOKIE_NAME, token, adminCookieOptions());
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, "", { ...adminCookieOptions(), maxAge: 0 });
  return res;
}
