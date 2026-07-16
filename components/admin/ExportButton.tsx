"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

type Scope = "all" | "winners" | "available";

interface ColumnOption {
  key: string;
  label: string;
  group: "core" | "winner";
}

const COLUMN_OPTIONS: ColumnOption[] = [
  { key: "code", label: "Codigo", group: "core" },
  { key: "generated_at", label: "Fecha de generacion", group: "core" },
  { key: "claimed", label: "Estado de reclamo (TRUE/FALSE)", group: "core" },
  { key: "claimed_at", label: "Fecha de reclamo", group: "winner" },
  { key: "winner_name", label: "Nombre del ganador", group: "winner" },
  { key: "winner_email", label: "Correo del ganador", group: "winner" },
  { key: "winner_phone", label: "Telefono del ganador", group: "winner" },
  { key: "winner_address", label: "Direccion del ganador", group: "winner" },
  { key: "character", label: "Personaje asignado", group: "winner" },
];

interface ExportButtonProps {
  defaultScope?: Scope;
  label?: string;
  disabled?: boolean;
}

const PRESETS: { id: string; label: string; description: string; scope: Scope; columns: string[] }[] = [
  {
    id: "only-codes",
    label: "Solo codigos",
    description: "Lista limpia, solo el codigo de cada hologram",
    scope: "all",
    columns: ["code"],
  },
  {
    id: "only-winners",
    label: "Solo ganadores",
    description: "Codigos ya reclamados con todos los datos del ganador",
    scope: "winners",
    columns: ["code", "generated_at", "claimed_at", "winner_name", "winner_email", "winner_phone", "winner_address", "character"],
  },
  {
    id: "only-available",
    label: "Solo disponibles",
    description: "Codigos generados que aun no han sido reclamados",
    scope: "available",
    columns: ["code", "generated_at"],
  },
  {
    id: "all",
    label: "Todo (9 columnas)",
    description: "Exportacion completa del sheet",
    scope: "all",
    columns: COLUMN_OPTIONS.map((c) => c.key),
  },
];

export function ExportButton({ defaultScope = "all", label = "Exportar", disabled = false }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<Scope>(defaultScope);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(COLUMN_OPTIONS.map((c) => c.key))
  );
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  function applyPreset(id: string) {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setScope(preset.scope);
    setSelected(new Set(preset.columns));
  }

  function toggleColumn(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleExport() {
    if (selected.size === 0) {
      toast.error("Selecciona al menos una columna");
      return;
    }
    setLoading(true);
    try {
      const orderedColumns = COLUMN_OPTIONS
        .map((c) => c.key)
        .filter((k) => selected.has(k));
      const params = new URLSearchParams({
        scope,
        columns: orderedColumns.join(","),
      });
      const res = await fetch(`/api/codes/export?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error exportando");
      }
      const blob = await res.blob();
      const today = new Date().toISOString().slice(0, 10);
      const scopePart = scope === "winners" ? "ganadores" : scope === "available" ? "disponibles" : "todos";
      const filename = `binkis-${scopePart}-${today}.csv`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setOpen(false);
      toast.success("CSV descargado", filename);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error exportando");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} disabled={disabled}>
        <Download size={14} strokeWidth={2.5} />
        {label}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Exportar a Excel"
        description="Elige que filas y columnas incluir en el archivo CSV."
        className="max-w-lg"
        footer={
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-ink-500">
              {selected.size} columna{selected.size === 1 ? "" : "s"} seleccionada{selected.size === 1 ? "" : "s"}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={handleExport} loading={loading}>
                Descargar CSV
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-500">
              Filas a incluir
            </p>
            <div className="flex flex-col gap-1.5">
              {[
                { value: "all", label: "Todos los codigos generados" },
                { value: "winners", label: "Solo codigos ganadores (reclamados)" },
                { value: "available", label: "Solo codigos disponibles (no reclamados)" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors",
                    scope === opt.value
                      ? "border-accent bg-accent/5 text-ink-900"
                      : "border-ink-100 text-ink-700 hover:border-ink-200"
                  )}
                >
                  <input
                    type="radio"
                    name="export-scope"
                    value={opt.value}
                    checked={scope === opt.value}
                    onChange={() => setScope(opt.value as Scope)}
                    className="h-3.5 w-3.5 accent-accent"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">
                Columnas a incluir
              </p>
              <div className="flex gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id)}
                    title={p.description}
                    className="rounded border border-ink-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-500 hover:border-ink-300 hover:text-ink-900"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {COLUMN_OPTIONS.map((col) => (
                <label
                  key={col.key}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-ink-100 px-3 py-1.5 text-sm text-ink-700 hover:border-ink-200"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(col.key)}
                    onChange={() => toggleColumn(col.key)}
                    className="h-3.5 w-3.5 accent-accent"
                  />
                  <span>{col.label}</span>
                </label>
              ))}
            </div>
          </section>
        </div>
      </Dialog>
    </>
  );
}
