import { ScanLine, CheckCircle2, Trophy, XCircle } from "lucide-react";
import { Topbar } from "@/components/admin/Topbar";
import { MetricCard } from "@/components/admin/MetricCard";
import { ScansTable } from "@/components/admin/ScansTable";
import { getRecentScans } from "@/lib/supabase/scans";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const WINDOW = 1000;

export default async function ScansPage() {
  const scans = await getRecentScans(WINDOW);
  const valid = scans.filter((s) => s.result === "valid").length;
  const claimed = scans.filter((s) => s.result === "claimed").length;
  const invalid = scans.filter((s) => s.result === "invalid").length;

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Escaneos"
        description={`Registro de cada escaneo de codigo. Mostrando los ultimos ${formatNumber(scans.length)}.`}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4 sm:px-6 lg:overflow-hidden lg:px-8">
        <section className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Escaneos"
            value={formatNumber(scans.length)}
            icon={<ScanLine size={16} strokeWidth={2} />}
            hint="en esta vista"
          />
          <MetricCard
            label="Validos"
            value={formatNumber(valid)}
            icon={<CheckCircle2 size={16} strokeWidth={2} />}
            hint="ganador disponible"
          />
          <MetricCard
            label="Reclamados"
            value={formatNumber(claimed)}
            icon={<Trophy size={16} strokeWidth={2} />}
            hint="ya reclamados"
          />
          <MetricCard
            label="Invalidos"
            value={formatNumber(invalid)}
            icon={<XCircle size={16} strokeWidth={2} />}
            hint="no ganadores / no existen"
          />
        </section>

        <ScansTable scans={scans} />
      </div>
    </div>
  );
}
