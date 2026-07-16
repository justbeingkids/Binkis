"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDown, ArrowUp, ChevronsUpDown, FileSearch } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import type { CodeRecord } from "@/types";

type SortKey = "code" | "generatedAt" | "claimed" | "claimedAt";
type SortDir = "asc" | "desc";

interface CodesTableProps {
  codes: CodeRecord[];
  showWinner?: boolean;
  paginated?: boolean;
}

function compareValues(a: string | boolean | null, b: string | boolean | null): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

export function CodesTable({ codes, showWinner = false, paginated = true }: CodesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("generatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  const sorted = useMemo(() => {
    const arr = [...codes];
    arr.sort((a, b) => {
      const av =
        sortKey === "code"
          ? a.code
          : sortKey === "generatedAt"
          ? a.generatedAt
          : sortKey === "claimed"
          ? a.claimed
          : a.claimedAt;
      const bv =
        sortKey === "code"
          ? b.code
          : sortKey === "generatedAt"
          ? b.generatedAt
          : sortKey === "claimed"
          ? b.claimed
          : b.claimedAt;
      const cmp = compareValues(av as string | boolean | null, bv as string | boolean | null);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [codes, sortKey, sortDir]);

  const visible = paginated ? sorted.slice((page - 1) * pageSize, page * pageSize) : sorted;

  if (codes.length === 0) {
    return (
      <Table>
        <THead>
          <SortableTH active={sortKey === "code"} dir={sortDir} onClick={() => toggleSort("code")}>
            Codigo
          </SortableTH>
          <SortableTH active={sortKey === "generatedAt"} dir={sortDir} onClick={() => toggleSort("generatedAt")}>
            Generado
          </SortableTH>
          <SortableTH active={sortKey === "claimed"} dir={sortDir} onClick={() => toggleSort("claimed")}>
            Estado
          </SortableTH>
          <SortableTH active={sortKey === "claimedAt"} dir={sortDir} onClick={() => toggleSort("claimedAt")}>
            Reclamado
          </SortableTH>
          {showWinner ? <TH>Ganador</TH> : null}
          {showWinner ? <TH>Personaje</TH> : null}
          <TH className="text-right">Acciones</TH>
        </THead>
        <TBody>
          <tr>
            <td colSpan={showWinner ? 7 : 5}>
              <EmptyState>
                <div className="flex flex-col items-center gap-3 text-ink-500">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted">
                    <FileSearch size={18} strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink-700">No hay codigos aun</p>
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
    <Table>
      <THead>
        <SortableTH active={sortKey === "code"} dir={sortDir} onClick={() => toggleSort("code")}>
          Codigo
        </SortableTH>
        <SortableTH active={sortKey === "generatedAt"} dir={sortDir} onClick={() => toggleSort("generatedAt")}>
          Generado
        </SortableTH>
        <SortableTH active={sortKey === "claimed"} dir={sortDir} onClick={() => toggleSort("claimed")}>
          Estado
        </SortableTH>
        <SortableTH active={sortKey === "claimedAt"} dir={sortDir} onClick={() => toggleSort("claimedAt")}>
          Reclamado
        </SortableTH>
        {showWinner ? <TH>Ganador</TH> : null}
        {showWinner ? <TH>Personaje</TH> : null}
        <TH className="text-right">Acciones</TH>
      </THead>
      <TBody>
        {visible.map((c, idx) => (
          <TR key={c.code} striped={idx % 2 === 1}>
            <TD className="font-mono text-[13px] font-medium tracking-wider text-ink-900">{c.code}</TD>
            <TD className="text-ink-500 tabular-nums">{formatDateTime(c.generatedAt)}</TD>
            <TD>
              {c.claimed ? (
                <Badge tone="success">Reclamado</Badge>
              ) : c.isWinner ? (
                <Badge tone="warning">Ganador</Badge>
              ) : (
                <Badge tone="neutral">No ganador</Badge>
              )}
            </TD>
            <TD className="text-ink-500 tabular-nums">{formatDateTime(c.claimedAt)}</TD>
            {showWinner ? (
              <TD>
                {c.winnerName ? (
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-soft text-[10px] font-semibold uppercase tracking-tight text-amber">
                      {initials(c.winnerName)}
                    </span>
                    <div className="flex flex-col leading-tight">
                      <span className="text-ink-900">{c.winnerName}</span>
                      <span className="text-xs text-ink-400">{c.winnerEmail}</span>
                    </div>
                  </div>
                ) : (
                  <span className="text-ink-300">-</span>
                )}
              </TD>
            ) : null}
            {showWinner ? (
              <TD>
                {c.characterName ? (
                  <Badge tone="warning">{c.characterName}</Badge>
                ) : (
                  <span className="text-ink-300">-</span>
                )}
              </TD>
            ) : null}
            <TD className="text-right">
              <Link
                href={`/card/${c.code}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
              >
                Ver hologram
                <ArrowUpRight size={12} strokeWidth={2.5} />
              </Link>
            </TD>
          </TR>
        ))}
      </TBody>
      {paginated && sorted.length > pageSize ? (
        <tfoot>
          <tr>
            <td colSpan={showWinner ? 7 : 5} className="p-0">
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
            <ArrowUp size={11} strokeWidth={2.5} className="text-amber" />
          ) : (
            <ArrowDown size={11} strokeWidth={2.5} className="text-amber" />
          )
        ) : (
          <ChevronsUpDown size={11} strokeWidth={2} className="text-ink-300" />
        )}
      </button>
    </TH>
  );
}
