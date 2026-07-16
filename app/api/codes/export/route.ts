import { getAllCodes } from "@/lib/supabase/codes";
import { isAdminAuthed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type Scope = "all" | "winners" | "available" | "factory";

const SHEET_HEADERS = [
  "code",
  "is_winner",
  "claimed",
  "claimed_at",
  "winner_name",
  "winner_email",
  "winner_phone",
  "winner_address",
  "character",
  "generated_at",
] as const;

function escapeCsv(value: string): string {
  if (value === "") return "";
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseColumns(raw: string | null): readonly string[] {
  if (!raw) return SHEET_HEADERS;
  const requested = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (requested.length === 0) return SHEET_HEADERS;
  return requested.filter((c) => (SHEET_HEADERS as readonly string[]).includes(c));
}

function sanitizeDomain(input: string | null): string {
  if (!input) return "";
  return input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
}

function buildFactoryCsv(codes: string[], domain: string): string {
  const lines = codes.map((code) =>
    domain ? `https://${domain}/claim?code=${code}` : code
  );
  return lines.join("\r\n");
}

export async function GET(request: Request) {
  if (!(await isAdminAuthed())) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(request.url);
  const scope = (url.searchParams.get("scope") ?? "all") as Scope;
  const domain = sanitizeDomain(url.searchParams.get("domain"));
  const today = new Date().toISOString().slice(0, 10);

  try {
    const all = await getAllCodes();

    if (scope === "factory") {
      const codes = all.map((r) => r.code);
      const csv = buildFactoryCsv(codes, domain);
      const filename = `binkis-fabrica-${today}.csv`;
      return new Response("﻿" + csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const columns = parseColumns(url.searchParams.get("columns"));
    const filtered = all.filter((r) => {
      if (scope === "winners") return r.isWinner;
      if (scope === "available") return r.isWinner && !r.claimed;
      return true;
    });

    const lines: string[] = [];
    lines.push(columns.join(","));
    for (const r of filtered) {
      const row = columns.map((col) => {
        switch (col) {
          case "code":
            return r.code;
          case "is_winner":
            return r.isWinner ? "TRUE" : "FALSE";
          case "claimed":
            return r.claimed ? "TRUE" : "FALSE";
          case "claimed_at":
            return r.claimedAt ?? "";
          case "winner_name":
            return r.winnerName ?? "";
          case "winner_email":
            return r.winnerEmail ?? "";
          case "winner_phone":
            return r.winnerPhone ?? "";
          case "winner_address":
            return r.winnerAddress ?? "";
          case "character":
            return r.characterName ?? "";
          case "generated_at":
            return r.generatedAt;
          default:
            return "";
        }
      });
      lines.push(row.map(escapeCsv).join(","));
    }
    const csv = lines.join("\r\n");

    const scopePart =
      scope === "winners" ? "ganadores" : scope === "available" ? "disponibles" : "todos";
    const filename = `binkis-${scopePart}-${today}.csv`;

    return new Response("﻿" + csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
