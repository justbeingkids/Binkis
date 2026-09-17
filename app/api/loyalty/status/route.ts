import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyBearer } from "@/lib/shopify-verify";
import { pointsForEmail, statusForPoints } from "@/lib/loyalty-status";

export const dynamic = "force-dynamic";

/**
 * Server-to-server loyalty lookup by email, for MIMIC's backend or a Shopify
 * Function. Requires `Authorization: Bearer LOYALTY_API_KEY`, so it must never
 * be called from the theme: a key in the browser is a public key. The theme
 * uses /api/loyalty/proxy through Shopify's App Proxy instead.
 */
export async function GET(request: Request) {
  if (!verifyBearer(request.headers.get("authorization"), process.env.LOYALTY_API_KEY)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const email = z.string().email().max(200).safeParse(new URL(request.url).searchParams.get("email"));
  if (!email.success) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  try {
    const points = await pointsForEmail(email.data);
    return NextResponse.json(statusForPoints(points), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("loyalty status failed:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
