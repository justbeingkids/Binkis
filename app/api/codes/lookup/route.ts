import { NextResponse } from "next/server";
import { findCode } from "@/lib/supabase/codes";
import { isValidCodeFormat } from "@/lib/codes/generator";
import { isAdminAuthed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * Admin-only code lookup. Unlike the public /api/codes/validate (which only
 * answers "is this a winner the public can claim?" and treats every
 * non-winner as "invalid"), this reports the FULL status of a code so the
 * admin can tell an existing-but-not-winner code apart from one that does not
 * exist at all.
 *
 * states: invalid_format | not_found | exists_not_winner | winner_available | claimed
 */
export async function GET(request: Request) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const code = (url.searchParams.get("code") ?? "").trim().toUpperCase();

  if (!code || !isValidCodeFormat(code)) {
    return NextResponse.json({ state: "invalid_format", code, exists: false });
  }

  try {
    const record = await findCode(code);

    if (!record) {
      return NextResponse.json({ state: "not_found", code, exists: false });
    }

    const state = !record.isWinner
      ? "exists_not_winner"
      : record.claimed
      ? "claimed"
      : "winner_available";

    return NextResponse.json({
      state,
      code,
      exists: true,
      isWinner: record.isWinner,
      claimed: record.claimed,
      claimedAt: record.claimedAt,
      generatedAt: record.generatedAt,
      winnerName: record.winnerName,
      winnerEmail: record.winnerEmail,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
