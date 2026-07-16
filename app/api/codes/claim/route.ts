import { NextResponse } from "next/server";
import { z } from "zod";
import { markCodeClaimed } from "@/lib/supabase/codes";
import { assignCharacter } from "@/lib/supabase/characters";
import { addPoints } from "@/lib/supabase/loyalty";
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

    // Winner confirmed for this email. Assign a character (idempotent: a code
    // keeps the same character across re-submits) so we can reveal the prize.
    let character: { id: string; name: string } | null = null;
    try {
      character = await assignCharacter(code);
    } catch (assignErr) {
      // Never fail the claim over prize assignment (e.g. inventory exhausted);
      // the winner is recorded and an admin can reconcile stock manually.
      console.error("assignCharacter failed:", assignErr);
    }

    // Award the one-time winner loyalty bonus exactly once (only on the call
    // that actually flipped the code to claimed).
    if (justClaimed && config.winnerBonusPoints > 0) {
      try {
        await addPoints(updated.winnerEmail ?? winner.email, config.winnerBonusPoints, "winner_bonus");
      } catch (pointsErr) {
        console.error("addPoints (winner_bonus) failed:", pointsErr);
      }
    }

    return NextResponse.json({ ok: true, character });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
