import Link from "next/link";
import { Code2, CircleCheck, Trophy, Boxes } from "lucide-react";
import { Topbar } from "@/components/admin/Topbar";
import { MetricCard } from "@/components/admin/MetricCard";
import { CodesTable } from "@/components/admin/CodesTable";
import { Button } from "@/components/ui/Button";
import { buildDailySeries, computeMetrics, getAllCodes } from "@/lib/supabase/codes";
import { formatNumber, formatPercent } from "@/lib/format";
import type { CodeRecord } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Delta = { value: string; direction: "up" | "down" | "flat" };

/** Percent change of the latest bucket vs the average of the prior buckets. */
function pctDelta(values: number[]): Delta {
  if (values.length < 2) return { value: "0%", direction: "flat" };
  const last = values[values.length - 1] ?? 0;
  const prevAvg = values.slice(0, -1).reduce((a, b) => a + b, 0) / (values.length - 1);
  if (prevAvg === 0) {
    return last > 0 ? { value: "+100%", direction: "up" } : { value: "0%", direction: "flat" };
  }
  const pct = ((last - prevAvg) / prevAvg) * 100;
  return {
    value: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`,
    direction: pct > 0 ? "up" : pct < 0 ? "down" : "flat",
  };
}

/** Latest codes first, by activity time (claim time when claimed, else generation). */
function byRecency(codes: CodeRecord[]): CodeRecord[] {
  return [...codes].sort((a, b) => {
    const at = a.claimedAt ?? a.generatedAt;
    const bt = b.claimedAt ?? b.generatedAt;
    return bt > at ? 1 : bt < at ? -1 : 0;
  });
}

export default async function DashboardPage() {
  const codes = await getAllCodes();
  const metrics = computeMetrics(codes);
  const series = buildDailySeries(codes, 7);
  const winnerShare = metrics.totalGenerated === 0 ? 0 : metrics.totalWinners / metrics.totalGenerated;
  const recent = byRecency(codes);

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Resumen"
        action={
          <Link href="/generate">
            <Button className="gap-2">
              <Code2 size={16} strokeWidth={2.25} />
              Generar codigos
            </Button>
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-4 px-4 pb-4 sm:px-6 lg:min-h-0 lg:overflow-hidden lg:px-8">
        {/* KPI row */}
        <section className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Codigos generados"
            value={formatNumber(metrics.totalGenerated)}
            icon={<Code2 size={16} strokeWidth={2} />}
            delta={pctDelta(series.generated)}
            hint="vs. periodo previo"
          />
          <MetricCard
            label="Codigos usados"
            value={formatNumber(metrics.totalClaimed)}
            icon={<CircleCheck size={16} strokeWidth={2} />}
            delta={pctDelta(series.claimed)}
            hint="vs. periodo previo"
          />
          <MetricCard
            label="Ganadores"
            value={formatNumber(metrics.totalWinners)}
            icon={<Trophy size={16} strokeWidth={2} />}
            hint={`${formatPercent(winnerShare)} del total`}
          />
          <MetricCard
            label="Codigos disponibles"
            value={formatNumber(metrics.totalAvailable)}
            icon={<Boxes size={16} strokeWidth={2} />}
            hint="Ganadores sin reclamar"
          />
        </section>

        {/* Recent activity */}
        <section className="flex min-h-[320px] flex-col rounded-xl border border-ink-200 bg-white shadow-card lg:min-h-0 lg:flex-1">
          <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
            <h2 className="text-base font-semibold text-ink-900">Actividad reciente</h2>
            <Link href="/codes" className="text-sm font-medium text-brand hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <CodesTable codes={recent} />
          </div>
        </section>
      </div>
    </div>
  );
}
