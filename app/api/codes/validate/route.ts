import { NextResponse } from "next/server";
import { findCode } from "@/lib/supabase/codes";
import { assignCharacter } from "@/lib/supabase/characters";
import { isValidCodeFormat } from "@/lib/codes/generator";
import { recordScan } from "@/lib/supabase/scans";
import { extractGeo } from "@/lib/geo";
import type { ValidationResult } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code")?.trim() ?? "";

  // Resolve the public result plus a couple of internal flags for the scan log.
  let result: ValidationResult;
  let isWinner: boolean | null = null;
  let codeExists = false;

  try {
    if (!code || !isValidCodeFormat(code)) {
      result = { state: "invalid", code };
    } else {
      const record = await findCode(code);
      if (record) {
        codeExists = true;
        isWinner = record.isWinner;
      }
      if (!record || !record.isWinner) {
        result = { state: "invalid", code };
      } else if (record.claimed) {
        result = { state: "claimed", code, claimedAt: record.claimedAt };
      } else {
        result = { state: "valid", code };
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Award the prize the moment the win is confirmed. assign_character is
  // idempotent per code (a re-scan returns the same character), so repeated
  // scans always reveal the same prize. A prize-assignment failure (e.g. stock
  // exhausted) must never break the win result the user is waiting for.
  if (result.state === "valid") {
    try {
      const character = await assignCharacter(code);
      if (character) result.character = character;
    } catch (awardErr) {
      console.error("assignCharacter (win) failed:", awardErr);
    }
  }

  // Record EVERY scan request (winner or not) with coarse geo + user-agent.
  // Logging must never break the result the user is waiting for.
  try {
    const geo = extractGeo(request);
    await recordScan({
      code: code.slice(0, 64),
      result: result.state,
      isWinner,
      codeExists,
      ip: geo.ip,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      userAgent: request.headers.get("user-agent") ?? "",
    });
  } catch (logErr) {
    console.error("recordScan failed:", logErr);
  }

  return NextResponse.json(result);
}
