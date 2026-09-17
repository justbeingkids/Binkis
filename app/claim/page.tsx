import Link from "next/link";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { WinnerForm } from "@/components/public/WinnerForm";
import { findCode } from "@/lib/supabase/codes";
import { isValidCodeFormat } from "@/lib/codes/generator";
import { formatDateTime } from "@/lib/format";
import { publicEnv } from "@/lib/env";
import { headers } from "next/headers";
import { recordScan } from "@/lib/supabase/scans";
import { extractGeo } from "@/lib/geo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ code?: string }>;
}

export default async function ClaimPage({ searchParams }: PageProps) {
  const { code = "" } = await searchParams;
  const cleaned = code.trim().toUpperCase();

  const validFormat = isValidCodeFormat(cleaned);
  const record = validFormat ? await findCode(cleaned) : null;

  // The printed QR opens this page directly, so this is where scans happen.
  // Logging is read-only with respect to the code and must never break the page.
  try {
    const h = await headers();
    const geo = extractGeo(new Request("https://scan.local/claim", { headers: h }));
    await recordScan({
      code: cleaned.slice(0, 64),
      result: !record || !record.isWinner ? "invalid" : record.claimed ? "claimed" : "valid",
      isWinner: record ? record.isWinner : null,
      codeExists: Boolean(record),
      ip: geo.ip,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      userAgent: h.get("user-agent") ?? "",
    });
  } catch (logErr) {
    console.error("recordScan (claim page) failed:", logErr);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">
            {publicEnv.NEXT_PUBLIC_BRAND_NAME}
          </p>
          <p className="mt-1 text-xs text-ink-400">
            Validacion de hologram - Coleccion No.{publicEnv.NEXT_PUBLIC_COLLECTION_NUMBER}
          </p>
        </div>

        {!validFormat || !record || !record.isWinner ? (
          <NotAWinnerState code={cleaned} />
        ) : null}
        {record && record.isWinner && record.claimed ? (
          <ClaimedState claimedAt={record.claimedAt} />
        ) : null}
        {record && record.isWinner && !record.claimed ? (
          <ValidState code={cleaned} />
        ) : null}

        <div className="mt-8 text-center">
          <Link href="/" className="text-xs text-ink-400 hover:text-ink-700">
            {publicEnv.NEXT_PUBLIC_BRAND_NAME}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ValidState({ code }: { code: string }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white shadow-soft">
      <div className="border-b border-ink-100 bg-status-claimedBg/50 px-6 py-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 size={28} className="text-status-claimed" strokeWidth={2} />
          <div>
            <p className="text-lg font-semibold text-ink-900">¡Felicitaciones!</p>
            <p className="text-sm text-ink-500">Este hologram es ganador.</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-5">
        <div className="mb-5 rounded-md border border-ink-100 bg-surface-muted px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Codigo</p>
          <p className="mt-1 font-mono text-sm font-semibold text-ink-900">{code}</p>
        </div>
        <p className="mb-5 text-sm text-ink-700">Complete los datos para enviarle su premio.</p>
        <WinnerForm code={code} />
      </div>
    </div>
  );
}

function ClaimedState({ claimedAt }: { claimedAt: string | null }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white shadow-soft">
      <div className="border-b border-ink-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <AlertTriangle size={28} className="text-ink-500" strokeWidth={2} />
          <div>
            <p className="text-lg font-semibold text-ink-900">Codigo ya reclamado</p>
            <p className="text-sm text-ink-500">Este hologram fue validado anteriormente.</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-5">
        <p className="text-sm text-ink-700">
          El premio asociado a este codigo ya fue asignado el{" "}
          <span className="font-semibold">{formatDateTime(claimedAt)}</span>.
        </p>
        <p className="mt-3 text-xs text-ink-400">
          Si crees que esto es un error, comunicate con el equipo de soporte de BinKis.
        </p>
      </div>
    </div>
  );
}

function NotAWinnerState({ code }: { code: string }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white shadow-soft">
      <div className="border-b border-ink-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <XCircle size={28} className="text-ink-500" strokeWidth={2} />
          <div>
            <p className="text-lg font-semibold text-ink-900">Gracias por jugar</p>
            <p className="text-sm text-ink-500">
              Este hologram no es ganador en esta edicion.
            </p>
          </div>
        </div>
      </div>
      <div className="px-6 py-5">
        {code ? (
          <div className="mb-4 rounded-md border border-ink-100 bg-surface-muted px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Codigo recibido</p>
            <p className="mt-1 break-all font-mono text-sm text-ink-700">{code}</p>
          </div>
        ) : null}
        <p className="text-sm text-ink-700">
          La proxima edicion limitada de la coleccion {publicEnv.NEXT_PUBLIC_BRAND_NAME} esta por
          salir. Mantente atento.
        </p>
      </div>
    </div>
  );
}
