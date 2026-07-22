import { Star, Coins, Wallet, Gauge } from "lucide-react";
import { Topbar } from "@/components/admin/Topbar";
import { MetricCard } from "@/components/admin/MetricCard";
import { LoyaltyTable } from "@/components/admin/LoyaltyTable";
import { getLoyaltyAccounts } from "@/lib/supabase/loyalty";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PointsPage() {
  const accounts = await getLoyaltyAccounts();
  const totalPoints = accounts.reduce((sum, a) => sum + a.points, 0);
  const withBalance = accounts.filter((a) => a.points > 0).length;
  const avg = accounts.length > 0 ? Math.round(totalPoints / accounts.length) : 0;

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Puntos"
        description="Saldos del programa de fidelidad por cliente."
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4 sm:px-6 lg:overflow-hidden lg:px-8">
        <section className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Cuentas"
            value={formatNumber(accounts.length)}
            icon={<Star size={16} strokeWidth={2} />}
            hint="clientes con puntos"
          />
          <MetricCard
            label="Puntos en circulacion"
            value={formatNumber(totalPoints)}
            icon={<Coins size={16} strokeWidth={2} />}
            hint="suma de todos los saldos"
          />
          <MetricCard
            label="Con saldo"
            value={formatNumber(withBalance)}
            icon={<Wallet size={16} strokeWidth={2} />}
            hint="saldo mayor a cero"
          />
          <MetricCard
            label="Promedio"
            value={formatNumber(avg)}
            icon={<Gauge size={16} strokeWidth={2} />}
            hint="puntos por cuenta"
          />
        </section>

        <LoyaltyTable accounts={accounts} />
      </div>
    </div>
  );
}
