"use client";

import { useMemo, useState } from "react";
import { Search, X, Star } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { formatDateTime, formatNumber } from "@/lib/format";
import { tierForPoints } from "@/lib/loyalty-tiers";
import type { LoyaltyAccountRow } from "@/lib/supabase/loyalty";

function tierBadge(points: number) {
  const { current } = tierForPoints(points);
  if (!current) return <span className="text-ink-300">—</span>;
  if (current.key === "founder") return <Badge tone="warning">{current.name}</Badge>;
  if (current.key === "elite") return <Badge tone="info">{current.name}</Badge>;
  return <Badge tone="neutral">{current.name}</Badge>;
}

export function LoyaltyTable({ accounts }: { accounts: LoyaltyAccountRow[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((a) => a.email.toLowerCase().includes(q));
  }, [accounts, query]);

  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

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
            placeholder="Buscar por correo..."
            aria-label="Buscar cuentas"
            className="h-10 w-full rounded-lg border border-ink-200 bg-white pl-9 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand/15"
          />
        </div>
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setPage(1);
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-ink-500 hover:bg-surface-muted hover:text-ink-900"
          >
            <X size={15} strokeWidth={2} />
            Limpiar
          </button>
        ) : null}
        <p className="ml-auto text-xs text-ink-400">
          {formatNumber(filtered.length)} de {formatNumber(accounts.length)} cuentas
        </p>
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Table>
          <THead>
            <TH>Correo</TH>
            <TH className="text-right">Puntos</TH>
            <TH>Nivel</TH>
            <TH className="text-right">Actualizado</TH>
          </THead>
          <TBody>
            {visible.map((a, idx) => (
              <TR key={a.email} striped={idx % 2 === 1}>
                <TD className="font-medium text-ink-900">{a.email}</TD>
                <TD className="text-right tabular-nums font-semibold text-ink-900">{formatNumber(a.points)}</TD>
                <TD>{tierBadge(a.points)}</TD>
                <TD className="text-right tabular-nums text-ink-500">{formatDateTime(a.updatedAt)}</TD>
              </TR>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <EmptyState>
                    <div className="flex flex-col items-center gap-3 text-ink-500">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted">
                        <Star size={18} strokeWidth={1.75} />
                      </span>
                      <p className="text-sm font-medium text-ink-700">Sin cuentas de fidelidad todavia</p>
                    </div>
                  </EmptyState>
                </td>
              </tr>
            ) : null}
          </TBody>
          {filtered.length > pageSize ? (
            <tfoot>
              <tr>
                <td colSpan={4} className="p-0">
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
