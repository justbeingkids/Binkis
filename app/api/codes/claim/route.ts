import { NextResponse } from "next/server";
import { z } from "zod";
import { markCodeClaimed } from "@/lib/supabase/codes";
import { addPoints } from "@/lib/supabase/loyalty";
import { linkCustomer } from "@/lib/supabase/customers";
import { isValidCodeFormat } from "@/lib/codes/generator";
import { config } from "@/lib/config";

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

  try {
    const result = await markCodeClaimed(code, winner);
    if (!result) {
      return NextResponse.json({ error: "Codigo no existe" }, { status: 404 });
    }
    const { record: updated, justClaimed } = result;
    if (!updated.isWinner) {
      return NextResponse.json({ error: "Este codigo no es ganador" }, { status: 400 });
    }
    if (updated.claimed && updated.winnerEmail !== winner.email) {
      return NextResponse.json(
        { error: "Codigo ya fue reclamado" },
        { status: 409 }
      );
    }

    // Record/refresh the customer profile (by email) and link this winning code
    // to them, so one person owns all their winning codes -> characters. Never
    // fail the claim over this.
    try {
      await linkCustomer(code, winner);
    } catch (linkErr) {
      console.error("linkCustomer failed:", linkErr);
    }

    // The prize (character) is awarded at the win-confirmation scan
    // (/api/codes/validate), not here — this step only records the winner's
    // shipping details and the one-time loyalty bonus, granted exactly once on
    // the call that actually flipped the code to claimed.
    if (justClaimed && config.winnerBonusPoints > 0) {
      try {
        await addPoints(updated.winnerEmail ?? winner.email, config.winnerBonusPoints, "winner_bonus");
      } catch (pointsErr) {
        console.error("addPoints (winner_bonus) failed:", pointsErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
