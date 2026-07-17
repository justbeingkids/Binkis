"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown, FileSearch, Copy, Eye, Check } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { CodeRecord } from "@/types";

type SortKey = "code" | "generatedAt" | "status";
type SortDir = "asc" | "desc";

interface CodesTableProps {
  codes: CodeRecord[];
  /** Adds a winner (name + email) column — used on the Ganadores page. */
  showWinner?: boolean;
  paginated?: boolean;
  /** Adds a checkbox column with a "copy selected" affordance. */
  selectable?: boolean;
}

/** One canonical status per code, reused for the badge and for sorting. */
function statusOf(c: CodeRecord): { label: string; tone: "success" | "warning" | "neutral"; rank: number } {
  if (c.claimed) return { label: "Reclamado", tone: "success", rank: 0 };
  if (c.isWinner) return { label: "Ganador", tone: "warning", rank: 1 };
  return { label: "Disponible", tone: "neutral", rank: 2 };
}

function compareValues(a: string | number, b: string | number): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function CodesTable({ codes, showWinner = false, paginated = true, selectable = false }: CodesTableProps) {
  const toast = useToast();
  const [sortKey, setSortKey] = useState<SortKey>("generatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "generatedAt" ? "desc" : "asc");
    }
    setPage(1);
  }

  const sorted = useMemo(() => {
    const arr = [...codes];
    arr.sort((a, b) => {
      const cmp =
        sortKey === "code"
          ? compareValues(a.code, b.code)
          : sortKey === "status"
          ? compareValues(statusOf(a).rank, statusOf(b).rank)
          : compareValues(a.generatedAt, b.generatedAt);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [codes, sortKey, sortDir]);

  const visible = paginated ? sorted.slice((page - 1) * pageSize, page * pageSize) : sorted;
  const colCount = (selectable ? 1 : 0) + 4 + (showWinner ? 1 : 0) + 1;

  const allVisibleSelected = visible.length > 0 && visible.every((c) => selected.has(c.code));
  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visible.forEach((c) => next.delete(c.code));
      else visible.forEach((c) => next.add(c.code));
      return next;
    });
  }
  function toggleOne(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function copyToClipboard(text: string, feedback?: () => void) {
    try {
      await navigator.clipboard.writeText(text);
      feedback?.();
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  async function copySelected() {
    const list = sorted.filter((c) => selected.has(c.code)).map((c) => c.code);
    if (list.length === 0) return;
    await copyToClipboard(list.join("\n"), () =>
      toast.success(`${formatNumber(list.length)} codigos copiados`)
    );
  }

  const header = (
    <THead>
      {selectable ? (
        <TH className="w-10">
          <input
            type="checkbox"
            aria-label="Seleccionar todo"
            checked={allVisibleSelected}
            onChange={toggleAllVisible}
            className="h-4 w-4 rounded border-ink-300 accent-accent"
          />
        </TH>
      ) : null}
      <SortableTH active={sortKey === "code"} dir={sortDir} onClick={() => toggleSort("code")}>
        Codigo
      </SortableTH>
      <SortableTH active={sortKey === "status"} dir={sortDir} onClick={() => toggleSort("status")}>
        Estado
      </SortableTH>
      <TH>Personaje</TH>
      <SortableTH active={sortKey === "generatedAt"} dir={sortDir} onClick={() => toggleSort("generatedAt")}>
        Creado
      </SortableTH>
      {showWinner ? <TH>Ganador</TH> : null}
      <TH className="text-right">Acciones</TH>
    </THead>
  );

  if (codes.length === 0) {
    return (
      <Table>
        {header}
        <TBody>
          <tr>
            <td colSpan={colCount}>
              <EmptyState>
                <div className="flex flex-col items-center gap-3 text-ink-500">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted">
                    <FileSearch size={18} strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink-700">No hay codigos</p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      Genera tu primer batch desde la pagina &quot;Generar&quot;.
                    </p>
                  </div>
                </div>
              </EmptyState>
            </td>
          </tr>
        </TBody>
      </Table>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {selectable && selected.size > 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-ink-200 bg-surface-muted px-4 py-2 text-sm">
          <span className="font-medium text-ink-700">
            {formatNumber(selected.size)} seleccionado{selected.size === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copySelected}
              className="inline-flex items-center gap-1.5 rounded-md border border-ink-200 bg-white px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-surface-base"
            >
              <Copy size={13} strokeWidth={2} />
              Copiar codigos
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs font-medium text-ink-400 hover:text-ink-700"
            >
              Limpiar
            </button>
          </div>
        </div>
      ) : null}

      <Table>
        {header}
        <TBody>
          {visible.map((c, idx) => {
            const status = statusOf(c);
            const isSel = selected.has(c.code);
            return (
              <TR key={c.code} striped={idx % 2 === 1} className={isSel ? "bg-brand-soft/60" : undefined}>
                {selectable ? (
                  <TD>
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar ${c.code}`}
                      checked={isSel}
                      onChange={() => toggleOne(c.code)}
                      className="h-4 w-4 rounded border-ink-300 accent-accent"
                    />
                  </TD>
                ) : null}
                <TD className="font-mono text-[13px] font-medium tracking-wider text-ink-900">{c.code}</TD>
                <TD>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </TD>
                <TD>
                  {c.characterName ? (
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[10px] font-semibold text-ink-600">
                        {initials(c.characterName)}
                      </span>
                      <span className="text-ink-900">{c.characterName}</span>
                    </div>
                  ) : (
                    <span className="text-ink-300">-</span>
                  )}
                </TD>
                <TD className="tabular-nums text-ink-500">{formatDateTime(c.generatedAt)}</TD>
                {showWinner ? (
                  <TD>
                    {c.winnerName ? (
                      <div className="flex flex-col leading-tight">
                        <span className="text-ink-900">{c.winnerName}</span>
                        <span className="text-xs text-ink-400">{c.winnerEmail}</span>
                      </div>
                    ) : (
                      <span className="text-ink-300">-</span>
                    )}
                  </TD>
                ) : null}
                <TD>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      title="Copiar codigo"
                      onClick={() => copyToClipboard(c.code, () => {
                        setCopiedCode(c.code);
                        window.setTimeout(() => setCopiedCode((v) => (v === c.code ? null : v)), 1200);
                      })}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-ink-200 text-ink-500 transition-colors hover:bg-surface-muted hover:text-ink-900"
                    >
                      {copiedCode === c.code ? (
                        <Check size={14} strokeWidth={2.5} className="text-status-claimed" />
                      ) : (
                        <Copy size={14} strokeWidth={2} />
                      )}
                    </button>
                    <Link
                      href={`/card/${c.code}`}
                      title="Ver hologram"
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-ink-200 text-ink-500 transition-colors hover:bg-surface-muted hover:text-ink-900"
                    >
                      <Eye size={14} strokeWidth={2} />
                    </Link>
                  </div>
                </TD>
              </TR>
            );
          })}
        </TBody>
        {paginated && sorted.length > pageSize ? (
          <tfoot>
            <tr>
              <td colSpan={colCount} className="p-0">
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={sorted.length}
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
  );
}

function SortableTH({
  active,
  dir,
  onClick,
  children,
}: {
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <TH className="select-none">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
          active ? "text-ink-900" : "text-ink-500 hover:text-ink-700"
        )}
      >
        {children}
        {active ? (
          dir === "asc" ? (
            <ArrowUp size={11} strokeWidth={2.5} className="text-ink-700" />
          ) : (
            <ArrowDown size={11} strokeWidth={2.5} className="text-ink-700" />
          )
        ) : (
          <ChevronsUpDown size={11} strokeWidth={2} className="text-ink-300" />
        )}
      </button>
    </TH>
  );
}
