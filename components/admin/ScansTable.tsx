"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown, X, FileSearch } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { ScanRequest } from "@/lib/supabase/scans";

type ResultFilter = "all" | "valid" | "claimed" | "invalid";

const RESULT_OPTIONS: { value: ResultFilter; label: string }[] = [
  { value: "all", label: "Todos los resultados" },
  { value: "valid", label: "Valido" },
  { value: "claimed", label: "Reclamado" },
  { value: "invalid", label: "Invalido" },
];

function resultBadge(result: string) {
  if (result === "valid") return <Badge tone="success">Valido</Badge>;
  if (result === "claimed") return <Badge tone="warning">Reclamado</Badge>;
  return <Badge tone="neutral">Invalido</Badge>;
}

function location(s: ScanRequest): string {
  const parts = [s.city, s.country].filter((p) => p && p !== "Unknown");
  return parts.length ? parts.join(", ") : "—";
}

export function ScansTable({ scans }: { scans: ScanRequest[] }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ResultFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const hasFilters = query.trim() !== "" || result !== "all";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scans.filter((s) => {
      if (result !== "all" && s.result !== result) return false;
      if (q) {
        const hay = `${s.code ?? ""} ${s.ip ?? ""} ${s.city ?? ""} ${s.country ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [scans, query, result]);

  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  function clearFilters() {
    setQuery("");
    setResult("all");
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
            placeholder="Buscar por codigo, IP o ubicacion..."
            aria-label="Buscar escaneos"
            className="h-10 w-full rounded-lg border border-ink-200 bg-white pl-9 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand/15"
          />
        </div>
        <div className="relative">
          <select
            aria-label="Filtrar por resultado"
            value={result}
            onChange={(e) => {
              setResult(e.target.value as ResultFilter);
              setPage(1);
            }}
            className="h-10 appearance-none rounded-lg border border-ink-200 bg-white pl-3 pr-9 text-sm text-ink-700 hover:border-ink-300 focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand/15"
          >
            {RESULT_OPTIONS.map((o) => (
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
          {formatNumber(filtered.length)} de {formatNumber(scans.length)} escaneos
        </p>
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Table>
          <THead>
            <TH>Codigo</TH>
            <TH>Resultado</TH>
            <TH>Ganador</TH>
            <TH>Ubicacion</TH>
            <TH>IP</TH>
            <TH>Dispositivo</TH>
            <TH className="text-right">Fecha</TH>
          </THead>
          <TBody>
            {visible.map((s, idx) => (
              <TR key={s.id} striped={idx % 2 === 1}>
                <TD className="font-mono text-[13px] font-medium tracking-wider text-ink-900">
                  {s.code || "—"}
                </TD>
                <TD>{resultBadge(s.result)}</TD>
                <TD className="text-ink-700">
                  {s.isWinner === true ? "Si" : s.isWinner === false ? "No" : "—"}
                </TD>
                <TD className="text-ink-700">{location(s)}</TD>
                <TD className="font-mono text-xs text-ink-500">{s.ip || "—"}</TD>
                <TD className="max-w-[220px] truncate text-xs text-ink-400" title={s.userAgent ?? undefined}>
                  {s.userAgent || "—"}
                </TD>
                <TD className="text-right tabular-nums text-ink-500">{formatDateTime(s.createdAt)}</TD>
              </TR>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState>
                    <div className="flex flex-col items-center gap-3 text-ink-500">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted">
                        <FileSearch size={18} strokeWidth={1.75} />
                      </span>
                      <p className="text-sm font-medium text-ink-700">Sin escaneos que coincidan</p>
                    </div>
                  </EmptyState>
                </td>
              </tr>
            ) : null}
          </TBody>
          {filtered.length > pageSize ? (
            <tfoot>
              <tr>
                <td colSpan={7} className="p-0">
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
