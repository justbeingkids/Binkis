import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE_NAME, adminCookieOptions } from "@/lib/admin-auth";
import { getServerEnv } from "@/lib/env";
import { findAdminUser } from "@/lib/supabase/admin-users";
import { verifyPassword } from "@/lib/password";
import { signSession, SESSION_TTL_MS } from "@/lib/session";
import { getLockRemaining, recordFailure, clearAttempts } from "@/lib/supabase/login-attempts";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().email("Correo invalido"),
  password: z.string().min(1, "Password requerido"),
});

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const fromForwarded = forwarded ? forwarded.split(",")[0]?.trim() : null;
  return fromForwarded || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  const key = clientIp(request);

  // Escalating cooldown after failed attempts: 5s (1st), 10s (2nd), 30s (3rd+).
  const locked = await getLockRemaining(key);
  if (locked > 0) {
    return NextResponse.json(
      { error: `Demasiados intentos. Espera ${locked} segundo(s).`, retryAfter: locked },
      { status: 429, headers: { "Retry-After": String(locked) } }
    );
  }

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
    if (!user || !verifyPassword(password, user.passwordHash)) {
      const wait = await recordFailure(key);
      return NextResponse.json(
        { error: "Correo o password incorrecto", retryAfter: wait },
        wait > 0
          ? { status: 401, headers: { "Retry-After": String(wait) } }
          : { status: 401 }
      );
    }

    await clearAttempts(key);

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
