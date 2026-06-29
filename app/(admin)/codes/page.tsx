import Link from "next/link";
import { Topbar } from "@/components/admin/Topbar";
import { CodesTable } from "@/components/admin/CodesTable";
import { ExportButton } from "@/components/admin/ExportButton";
import { StatusFilter } from "@/components/admin/StatusFilter";
import { Button } from "@/components/ui/Button";
import { getAllCodes } from "@/lib/supabase/codes";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Status = "all" | "winners" | "available";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function CodesPage({ searchParams }: PageProps) {
  const { status } = await searchParams;
  const filter = (status === "winners" || status === "available" ? status : "all") as Status;

  const codes = await getAllCodes();
  const counts = {
    all: codes.length,
    winners: codes.filter((c) => c.isWinner).length,
    available: codes.filter((c) => c.isWinner && !c.claimed).length,
  } satisfies Record<Status, number>;

  const filtered = codes.filter((c) => {
    if (filter === "winners") return c.isWinner;
    if (filter === "available") return c.isWinner && !c.claimed;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => (b.generatedAt > a.generatedAt ? 1 : -1));

  const filterLabel = filter === "winners" ? "ganadores" : filter === "available" ? "disponibles" : "totales";
  const exportDefault: "all" | "winners" | "available" = filter;

  return (
    <>
      <Topbar
        title="Codigos"
        description={`${formatNumber(sorted.length)} ${filterLabel} de ${formatNumber(codes.length)} en la base`}
        action={
          <>
            <ExportButton defaultScope={exportDefault} disabled={codes.length === 0} label="Exportar" />
            <Link href="/generate">
              <Button>Generar mas</Button>
            </Link>
          </>
        }
      />
      <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusFilter counts={counts} />
          <p className="text-xs text-ink-400">
            Mostrando {formatNumber(sorted.length)} de {formatNumber(codes.length)} codigos
          </p>
        </div>
        <CodesTable codes={sorted} showWinner={filter === "winners"} />
      </div>
    </>
  );
}
