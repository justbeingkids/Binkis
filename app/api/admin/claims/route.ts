import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin-auth";
import { reviewClaim } from "@/lib/supabase/codes";
import { logAdminEvent } from "@/lib/supabase/audit-log";
import { isValidCodeFormat } from "@/lib/codes/generator";
import { extractGeo } from "@/lib/geo";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  code: z.string().min(1),
  status: z.enum(["approved", "rejected"]),
  note: z.string().max(500).optional(),
});

/** Approve or reject shipping a claimed prize. Every decision is audited. */
export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

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

  const { code, status, note } = parsed.data;
  if (!isValidCodeFormat(code)) {
    return NextResponse.json({ error: "Codigo no valido" }, { status: 400 });
  }

  try {
    const record = await reviewClaim(code, status, session.sub, note);
    if (!record) {
      return NextResponse.json({ error: "Reclamo no encontrado" }, { status: 404 });
    }

    const geo = extractGeo(request);
    await logAdminEvent({
      actorEmail: session.sub,
      action: "claim_reviewed",
      targetEmail: record.winnerEmail ?? "",
      ip: geo.ip,
      country: geo.country,
      city: geo.city,
      detail: `${status === "approved" ? "Aprobado" : "Rechazado"} el envio de ${code}${note ? `: ${note}` : ""}`,
    });

    return NextResponse.json({ ok: true, code: record });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
