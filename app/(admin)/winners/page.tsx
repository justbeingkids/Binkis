import { Topbar } from "@/components/admin/Topbar";
import { CodesTable } from "@/components/admin/CodesTable";
import { ExportButton } from "@/components/admin/ExportButton";
import { Badge } from "@/components/ui/Badge";
import { getAllCodes } from "@/lib/supabase/codes";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WinnersPage() {
  const codes = await getAllCodes();
  const winners = codes
    .filter((c) => c.claimed)
    .sort((a, b) => ((b.claimedAt ?? "") > (a.claimedAt ?? "") ? 1 : -1));

  return (
    <div className="flex h-full flex-col">
      <Topbar title="Ganadores" />

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 sm:px-6 lg:px-8">
        <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-ink-200 bg-white shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-semibold text-ink-900">Lista de ganadores</h2>
              <Badge tone="success">{formatNumber(winners.length)} reclamados</Badge>
            </div>
            <ExportButton defaultScope="winners" disabled={winners.length === 0} label="Exportar ganadores" />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <CodesTable codes={winners} showWinner />
          </div>
        </div>
      </div>
    </div>
  );
}
