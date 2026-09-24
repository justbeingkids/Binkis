import Link from "next/link";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { WinnerForm } from "@/components/public/WinnerForm";
import { WinnerReveal } from "@/components/public/WinnerReveal";
import { findCode } from "@/lib/supabase/codes";
import { isValidCodeFormat } from "@/lib/codes/generator";
import { formatDateTime } from "@/lib/format";
import { publicEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function ValidationPage({ params }: PageProps) {
  const { code } = await params;

  const validFormat = isValidCodeFormat(code);
  const record = validFormat ? await findCode(code) : null;

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

        {!validFormat || !record || !record.isWinner ? <InvalidState code={code} /> : null}
        {record && record.isWinner && record.claimed ? <ClaimedState claimedAt={record.claimedAt} /> : null}
        {record && record.isWinner && !record.claimed ? <ValidState code={code} /> : null}

        <div className="mt-8 text-center">
          <Link href="/" className="text-xs text-ink-400 hover:text-ink-700">
            Panel de administracion
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
        <WinnerReveal>
          <p className="mb-5 text-sm text-ink-700">
            Complete los datos para enviarle su premio.
          </p>
          <WinnerForm code={code} />
        </WinnerReveal>
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

function InvalidState({ code }: { code: string }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white shadow-soft">
      <div className="border-b border-ink-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <XCircle size={28} className="text-status-invalid" strokeWidth={2} />
          <div>
            <p className="text-lg font-semibold text-ink-900">Codigo no valido</p>
            <p className="text-sm text-ink-500">Este codigo no esta en nuestro sistema.</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-5">
        <div className="mb-4 rounded-md border border-ink-100 bg-surface-muted px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Codigo recibido</p>
          <p className="mt-1 break-all font-mono text-sm text-ink-700">{code}</p>
        </div>
        <p className="text-sm text-ink-700">
          Verifica que escaneaste un hologram oficial de BinKis. Si el codigo no aparece como ganador,
          significa que este hologram no contiene un premio.
        </p>
      </div>
    </div>
  );
}
