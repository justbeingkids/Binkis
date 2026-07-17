"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown, X } from "lucide-react";
import { CodesTable } from "@/components/admin/CodesTable";
import { ExportButton } from "@/components/admin/ExportButton";
import { formatNumber } from "@/lib/format";
import type { CodeRecord } from "@/types";

type Estado = "all" | "claimed" | "winner" | "available";

const ESTADO_OPTIONS: { value: Estado; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  { value: "claimed", label: "Reclamado" },
  { value: "winner", label: "Ganador" },
  { value: "available", label: "Disponible" },
];

function Select({
  value,
  onChange,
  children,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <div className="relative">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 appearance-none rounded-lg border border-ink-200 bg-white pl-3 pr-9 text-sm text-ink-700 hover:border-ink-300 focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand/15"
      >
        {children}
      </select>
      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400"
      />
    </div>
  );
}

export function CodesExplorer({
  codes,
  characterNames,
}: {
  codes: CodeRecord[];
  characterNames: string[];
}) {
  const [query, setQuery] = useState("");
  const [estado, setEstado] = useState<Estado>("all");
  const [personaje, setPersonaje] = useState<string>("all");

  const hasFilters = query.trim() !== "" || estado !== "all" || personaje !== "all";

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    return codes.filter((c) => {
      if (estado === "claimed" && !c.claimed) return false;
      if (estado === "winner" && !(c.isWinner && !c.claimed)) return false;
      if (estado === "available" && c.isWinner) return false;
      if (personaje !== "all" && c.characterName !== personaje) return false;
      if (q) {
        const hay = `${c.code} ${c.characterName ?? ""}`.toUpperCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [codes, query, estado, personaje]);

  function clearFilters() {
    setQuery("");
    setEstado("all");
    setPersonaje("all");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar codigos..."
            aria-label="Buscar codigos"
            className="h-10 w-full rounded-lg border border-ink-200 bg-white pl-9 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand/15"
          />
        </div>
        <Select value={estado} onChange={(v) => setEstado(v as Estado)} ariaLabel="Filtrar por estado">
          {ESTADO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select value={personaje} onChange={setPersonaje} ariaLabel="Filtrar por personaje">
          <option value="all">Todos los personajes</option>
          {characterNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
        {hasFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-ink-500 hover:bg-surface-muted hover:text-ink-900"
          >
            <X size={15} strokeWidth={2} />
            Limpiar filtros
          </button>
        ) : null}
        <div className="ml-auto">
          <ExportButton
            defaultScope={estado === "winner" ? "winners" : estado === "available" ? "available" : "all"}
            disabled={codes.length === 0}
          />
        </div>
      </div>

      <p className="text-xs text-ink-400">
        Mostrando {formatNumber(filtered.length)} de {formatNumber(codes.length)} codigos
      </p>

      {/* Table (scrolls within the fixed page frame) */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <CodesTable codes={filtered} selectable />
      </div>
    </div>
  );
}
