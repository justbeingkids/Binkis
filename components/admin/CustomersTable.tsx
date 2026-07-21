"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown, X, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { CustomerRow } from "@/lib/supabase/customers";

type TierFilter = "all" | "bronze" | "silver" | "gold";

const TIER_OPTIONS: { value: TierFilter; label: string }[] = [
  { value: "all", label: "Todos los niveles" },
  { value: "bronze", label: "Bronze" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
];

function tierBadge(tier: string) {
  const t = (tier || "bronze").toLowerCase();
  const label = t.charAt(0).toUpperCase() + t.slice(1);
  if (t === "gold") return <Badge tone="warning">{label}</Badge>;
  if (t === "silver") return <Badge tone="info">{label}</Badge>;
  return <Badge tone="neutral">{label}</Badge>;
}

export function CustomersTable({ customers }: { customers: CustomerRow[] }) {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<TierFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const hasFilters = query.trim() !== "" || tier !== "all";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      if (tier !== "all" && (c.tier || "bronze").toLowerCase() !== tier) return false;
      if (q) {
        const hay = `${c.name ?? ""} ${c.email} ${c.phone ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [customers, query, tier]);

  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  function clearFilters() {
    setQuery("");
    setTier("all");
    setPage(1);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nombre, correo o telefono..."
            aria-label="Buscar clientes"
            className="h-10 w-full rounded-lg border border-ink-200 bg-white pl-9 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand/15"
          />
        </div>
        <div className="relative">
          <select
            aria-label="Filtrar por nivel"
            value={tier}
            onChange={(e) => {
              setTier(e.target.value as TierFilter);
              setPage(1);
            }}
            className="h-10 appearance-none rounded-lg border border-ink-200 bg-white pl-3 pr-9 text-sm text-ink-700 hover:border-ink-300 focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand/15"
          >
            {TIER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
        </div>
        {hasFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-ink-500 hover:bg-surface-muted hover:text-ink-900"
          >
            <X size={15} strokeWidth={2} />
            Limpiar
          </button>
        ) : null}
        <p className="ml-auto text-xs text-ink-400">
          {formatNumber(filtered.length)} de {formatNumber(customers.length)} clientes
        </p>
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Table>
          <THead>
            <TH>Cliente</TH>
            <TH>Contacto</TH>
            <TH className="text-right">Premios</TH>
            <TH>Personajes</TH>
            <TH>Nivel</TH>
            <TH className="text-right">Registrado</TH>
          </THead>
          <TBody>
            {visible.map((c, idx) => {
              const distinct = [...new Set(c.characters)];
              return (
                <TR key={c.id} striped={idx % 2 === 1}>
                  <TD>
                    <div className="flex flex-col leading-tight">
                      <span className="font-medium text-ink-900">{c.name || "—"}</span>
                      <span className="text-xs text-ink-400">{c.email}</span>
                    </div>
                  </TD>
                  <TD className="text-ink-500">{c.phone || "—"}</TD>
                  <TD className="text-right tabular-nums font-medium text-ink-900">{formatNumber(c.winCount)}</TD>
                  <TD>
                    {distinct.length === 0 ? (
                      <span className="text-ink-300">—</span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1">
                        {distinct.slice(0, 3).map((name) => (
                          <Badge key={name} tone="neutral" dot={false}>
                            {name}
                          </Badge>
                        ))}
                        {distinct.length > 3 ? (
                          <span className="text-xs text-ink-400">+{distinct.length - 3}</span>
                        ) : null}
                      </div>
                    )}
                  </TD>
                  <TD>{tierBadge(c.tier)}</TD>
                  <TD className="text-right tabular-nums text-ink-500">{formatDateTime(c.createdAt)}</TD>
                </TR>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState>
                    <div className="flex flex-col items-center gap-3 text-ink-500">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted">
                        <Users size={18} strokeWidth={1.75} />
                      </span>
                      <p className="text-sm font-medium text-ink-700">Sin clientes que coincidan</p>
                    </div>
                  </EmptyState>
                </td>
              </tr>
            ) : null}
          </TBody>
          {filtered.length > pageSize ? (
            <tfoot>
              <tr>
                <td colSpan={6} className="p-0">
                  <Pagination
                    page={page}
                    pageSize={pageSize}
                    total={filtered.length}
                    onPageChange={setPage}
                    onPageSizeChange={(s) => {
                      setPageSize(s);
                      setPage(1);
                    }}
                  />
                </td>
              </tr>
            </tfoot>
          ) : null}
        </Table>
      </div>
    </div>
  );
}
