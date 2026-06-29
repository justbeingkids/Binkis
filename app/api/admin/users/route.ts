import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin-auth";
import { isSuperAdmin } from "@/lib/admin-roles";
import { listAdminUsers, createAdminUser } from "@/lib/supabase/admin-users";
import { hashPassword } from "@/lib/password";
import { logAdminEvent } from "@/lib/supabase/audit-log";
import { extractGeo } from "@/lib/geo";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isSuperAdmin(session.sub)) return NextResponse.json({ error: "Solo el super admin" }, { status: 403 });

  const users = await listAdminUsers();
  return NextResponse.json({ users });
}

const createSchema = z.object({
  email: z.string().email("Correo invalido"),
  password: z.string().min(4, "Password minimo 4 caracteres"),
});

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!isSuperAdmin(session.sub)) return NextResponse.json({ error: "Solo el super admin" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos invalidos" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const result = await createAdminUser(email, hashPassword(password));
  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason === "exists" ? "Ese correo ya existe" : "No se pudo crear el usuario" },
      { status: result.reason === "exists" ? 409 : 500 }
    );
  }

  const geo = extractGeo(request);
  await logAdminEvent({
    actorEmail: session.sub,
    action: "created",
    targetEmail: email.trim().toLowerCase(),
    ip: geo.ip,
    country: geo.country,
    city: geo.city,
  });
  return NextResponse.json({ ok: true });
}
