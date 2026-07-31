import { Star, Coins, Award, Crown } from "lucide-react";
import { Topbar } from "@/components/admin/Topbar";
import { MetricCard } from "@/components/admin/MetricCard";
import { LoyaltyTable } from "@/components/admin/LoyaltyTable";
import { getLoyaltyAccounts } from "@/lib/supabase/loyalty";
import { TIERS } from "@/lib/loyalty-tiers";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const COLLECTOR = TIERS[0].points; // 20
const FOUNDER = TIERS[2].points; // 40

export default async function PointsPage() {
  const accounts = await getLoyaltyAccounts();
  const totalPoints = accounts.reduce((sum, a) => sum + a.points, 0);
  const collectors = accounts.filter((a) => a.points >= COLLECTOR).length;
  const founders = accounts.filter((a) => a.points >= FOUNDER).length;

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
            label="Collectors"
            value={formatNumber(collectors)}
            icon={<Award size={16} strokeWidth={2} />}
            hint={`${COLLECTOR}+ puntos`}
          />
          <MetricCard
            label="Founder Reserve"
            value={formatNumber(founders)}
            icon={<Crown size={16} strokeWidth={2} />}
            hint={`${FOUNDER}+ puntos`}
          />
        </section>

        <LoyaltyTable accounts={accounts} />
      </div>
    </div>
  );
}
