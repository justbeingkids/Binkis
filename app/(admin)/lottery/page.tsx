import { Topbar } from "@/components/admin/Topbar";
import { LotteryPanel } from "@/components/admin/LotteryPanel";
import { CodesTable } from "@/components/admin/CodesTable";
import { ExportButton } from "@/components/admin/ExportButton";
import { Badge } from "@/components/ui/Badge";
import { computeMetrics, getAllCodes } from "@/lib/supabase/codes";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LotteryPage() {
  const codes = await getAllCodes();
  const metrics = computeMetrics(codes);
  const winners = codes
    .filter((c) => c.isWinner)
    .sort((a, b) => {
      const at = a.claimedAt ?? a.generatedAt;
      const bt = b.claimedAt ?? b.generatedAt;
      return bt > at ? 1 : -1;
    });

  return (
    <div className="flex h-full flex-col">
      <Topbar title="Sorteo" />

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-6 sm:px-6 lg:px-8">
        {/* Draw card */}
        <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-ink-200 border-t-2 border-t-brand bg-white p-6 shadow-card sm:p-8">
          <LotteryPanel currentTotal={metrics.totalGenerated} currentWinners={metrics.totalWinners} />
        </div>

        {/* Results */}
        <div className="rounded-xl border border-ink-200 bg-white shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-semibold text-ink-900">Resultados del sorteo</h2>
              <Badge tone="info">{formatNumber(metrics.totalWinners)} ganadores</Badge>
            </div>
            <ExportButton defaultScope="winners" disabled={winners.length === 0} label="Exportar" />
          </div>
          <div className="p-4">
            <CodesTable codes={winners} />
          </div>
        </div>
      </div>
    </div>
  );
}
