import { NextResponse } from "next/server";
import { z } from "zod";
import { markCodeClaimed } from "@/lib/supabase/codes";
import { linkCustomer } from "@/lib/supabase/customers";
import { assignCharacter } from "@/lib/supabase/characters";
import { isValidCodeFormat } from "@/lib/codes/generator";
import { clientIp } from "@/lib/client-ip";
import { logAdminEvent } from "@/lib/supabase/audit-log";
import { checkClaimThrottle, recordClaimAttempt, reportClaimFlood } from "@/lib/supabase/claim-throttle";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  code: z.string().min(1),
  name: z.string().min(2, "Nombre requerido").max(100),
  email: z.string().email("Correo invalido"),
  phone: z.string().min(6, "Telefono requerido").max(30),
  address: z.string().min(8, "Direccion requerida").max(300),
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
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { code, ...winner } = parsed.data;

  if (!isValidCodeFormat(code)) {
    return NextResponse.json({ error: "Codigo no valido" }, { status: 400 });
  }

  // Throttle before touching the code, so a blocked caller learns nothing
  // about it. A person with a hologram in their hand claims once.
  const ip = clientIp(request);
  const throttle = await checkClaimThrottle(ip);
  if (throttle.blocked) {
    await reportClaimFlood(ip, throttle.attempts, code);
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta de nuevo mas tarde." },
      { status: 429, headers: { "Retry-After": String(throttle.retryAfterSeconds) } }
    );
  }

  try {
    const result = await markCodeClaimed(code, winner);
    await recordClaimAttempt(ip, code, Boolean(result?.justClaimed));
    // The /claim page already tells anyone who scans whether a code exists and
    // is a winner, so those two answers leak nothing new.
    if (!result || !result.record.isWinner) {
      return NextResponse.json({ error: "Este codigo no es ganador" }, { status: 400 });
    }
    // Only the request that flipped the code wins. Anyone else gets the same
    // answer whatever email they typed, so this endpoint cannot be used to
    // test which email registered a code.
    if (!result.justClaimed) {
      return NextResponse.json({ error: "Codigo ya fue reclamado" }, { status: 409 });
    }

    // Record/refresh the customer profile (by email) and link this winning code
    // to them, so one person owns all their winning codes -> characters. Never
    // fail the claim over this.
    try {
      await linkCustomer(code, winner);
    } catch (linkErr) {
      console.error("linkCustomer failed:", linkErr);
    }

    // Award the prize here, on the winner's submit, not on a page load. Chat
    // apps and antivirus scanners fetch shared links to build previews, so a
    // GET that assigns stock can hand out a character nobody asked for.
    // assign_character is idempotent per code and race-safe. A stock problem
    // must never undo a claim that already succeeded.
    let character: { id: string; name: string } | null = null;
    try {
      character = await assignCharacter(code);
    } catch (awardErr) {
      console.error("assignCharacter (claim) failed:", awardErr);
    }

    // A claim that produced no prize is the one failure nobody would notice
    // from the outside: the winner is registered and the panel shows a blank
    // character. Stock runs out at 3,885 pieces, so say so where it is read.
    if (!character) {
      await logAdminEvent({
        actorEmail: "",
        action: "prize_unavailable",
        targetEmail: winner.email,
        ip,
        detail: `Reclamo ${code} registrado sin personaje asignado. Revisar existencias.`,
      });
    }

    // The claim is recorded, the prize is not on its way yet: shipping_status
    // stays 'pending' until someone approves it in the admin panel. See
    // schema.sql 8d for why that step exists.
    // No loyalty points are granted here: per the client's model, points are
    // earned by PURCHASES only, not by winning a Limited Edition.
    return NextResponse.json({ ok: true, character });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
