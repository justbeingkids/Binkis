import { Contact, Trophy, Repeat, Gauge } from "lucide-react";
import { Topbar } from "@/components/admin/Topbar";
import { MetricCard } from "@/components/admin/MetricCard";
import { CustomersTable } from "@/components/admin/CustomersTable";
import { getCustomers } from "@/lib/supabase/customers";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CustomersPage() {
  const customers = await getCustomers();
  const totalWins = customers.reduce((sum, c) => sum + c.winCount, 0);
  const repeat = customers.filter((c) => c.winCount >= 2).length;
  const avg = customers.length > 0 ? (totalWins / customers.length).toFixed(1) : "0";

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Clientes"
        description="Cada persona y los premios (personajes) que ha ganado."
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4 sm:px-6 lg:overflow-hidden lg:px-8">
        <section className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Clientes"
            value={formatNumber(customers.length)}
            icon={<Contact size={16} strokeWidth={2} />}
            hint="con al menos un premio"
          />
          <MetricCard
            label="Premios ganados"
            value={formatNumber(totalWins)}
            icon={<Trophy size={16} strokeWidth={2} />}
            hint="codigos ganadores reclamados"
          />
          <MetricCard
            label="Recurrentes"
            value={formatNumber(repeat)}
            icon={<Repeat size={16} strokeWidth={2} />}
            hint="con 2 o mas premios"
          />
          <MetricCard
            label="Promedio"
            value={avg}
            icon={<Gauge size={16} strokeWidth={2} />}
            hint="premios por cliente"
          />
        </section>

        <CustomersTable customers={customers} />
      </div>
    </div>
  );
}
