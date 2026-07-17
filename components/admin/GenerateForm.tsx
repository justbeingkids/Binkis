"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, ShieldCheck, Code2, Lock, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { formatNumber } from "@/lib/format";

interface GenerateFormProps {
  currentTotal: number;
  minPerBatch?: number;
  maxPerBatch?: number;
  defaultDomain?: string;
}

interface UniquenessReport {
  verified: boolean;
  existingBefore: number;
  addedNow: number;
  totalAfter: number;
  duplicatesDetected: number;
}

interface LastResult {
  generated: number;
  totalAfter: number;
  codes: string[];
  uniqueness?: UniquenessReport;
  domain: string;
}

function sanitizeDomain(input: string): string {
  return input.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase();
}

// Shown before a batch exists — communicates the real code shape (BNK-XXXX-XXXX).
const PLACEHOLDER_CODES = ["BNK-••••-••••", "BNK-••••-••••", "BNK-••••-••••", "BNK-••••-••••", "BNK-••••-••••", "BNK-••••-••••"];

export function GenerateForm({
  currentTotal,
  minPerBatch = 100,
  maxPerBatch = 10000,
  defaultDomain = "binkis.xyz",
}: GenerateFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [count, setCount] = useState(10000);
  const [domain, setDomain] = useState(defaultDomain);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LastResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const busy = isSubmitting || isPending;
  const presetCounts = [100, 1000, 5000, 10000];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (count < minPerBatch || count > maxPerBatch) {
      setError(`Ingrese un numero entre ${formatNumber(minPerBatch)} y ${formatNumber(maxPerBatch)}`);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/codes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error generando codigos");
        return;
      }
      setResult({
        generated: data.generated,
        totalAfter: data.totalAfter,
        codes: data.codes,
        uniqueness: data.uniqueness,
        domain: sanitizeDomain(domain),
      });
      toast.success(
        `${formatNumber(data.generated)} codigos generados`,
        `Total acumulado: ${formatNumber(data.totalAfter)}`
      );
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generando codigos");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDownloadFactoryCsv() {
    setDownloading(true);
    try {
      const cleanDomain = sanitizeDomain(domain);
      const params = new URLSearchParams({ scope: "factory" });
      if (cleanDomain) params.set("domain", cleanDomain);
      const res = await fetch(`/api/codes/export?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error exportando");
      }
      const blob = await res.blob();
      const today = new Date().toISOString().slice(0, 10);
      const filename = `binkis-fabrica-${today}.csv`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("CSV de fabrica descargado", filename);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error exportando");
    } finally {
      setDownloading(false);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied((v) => (v === code ? null : v)), 1200);
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  const previewCodes = result ? result.codes.slice(0, 8) : PLACEHOLDER_CODES;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Form */}
      <div className="rounded-xl border border-ink-200 bg-white p-5 shadow-card sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Input
              label="Cantidad"
              type="number"
              inputMode="numeric"
              min={minPerBatch}
              max={maxPerBatch}
              step={100}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              hint={`Numero de codigos unicos a generar (entre ${formatNumber(minPerBatch)} y ${formatNumber(maxPerBatch)}).`}
              error={error ?? undefined}
              disabled={busy}
            />
            <div className="flex flex-wrap gap-1.5">
              {presetCounts.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCount(preset)}
                  disabled={busy}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium tabular-nums transition-colors ${
                    count === preset
                      ? "border-accent bg-accent text-white"
                      : "border-ink-200 text-ink-600 hover:bg-surface-muted"
                  }`}
                >
                  {formatNumber(preset)}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Dominio para las URLs del QR (opcional)"
            type="text"
            placeholder="binkis.xyz"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            hint="Se incluye en el CSV de fabrica. Vacio exporta solo los codigos."
            autoComplete="off"
            disabled={busy}
          />

          <div className="flex flex-col gap-2 border-t border-ink-100 pt-5">
            <Button type="submit" size="lg" loading={busy} className="w-full gap-2">
              <Code2 size={17} strokeWidth={2.25} />
              Generar {formatNumber(count)} codigos
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleDownloadFactoryCsv}
              loading={downloading}
              disabled={currentTotal === 0 || isSubmitting}
              className="w-full gap-2"
            >
              <Download size={15} strokeWidth={2.25} />
              Descargar CSV para fabrica
            </Button>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-ink-400">
              <Lock size={12} strokeWidth={2} />
              Se generaran codigos unicos e irrepetibles.
            </p>
          </div>
        </form>
      </div>

      {/* Preview */}
      <div className="rounded-xl border border-ink-200 bg-white p-5 shadow-card sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink-900">Vista previa</h2>
          {result?.uniqueness ? (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                result.uniqueness.verified ? "text-status-claimed" : "text-status-invalid"
              }`}
            >
              <ShieldCheck size={14} strokeWidth={2.25} />
              {result.uniqueness.verified ? "Unicidad verificada" : "Revisar"}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-ink-500">
          {result
            ? `${formatNumber(result.generated)} codigos generados. Total: ${formatNumber(result.totalAfter)}.`
            : "Ejemplos del formato de codigo que se generara."}
        </p>

        <div className="mt-4 flex flex-col divide-y divide-ink-100">
          {previewCodes.map((code, i) => (
            <div key={`${code}-${i}`} className="flex items-center justify-between py-2.5">
              <span className={`font-mono text-sm ${result ? "text-ink-800" : "text-ink-300"}`}>{code}</span>
              {result ? (
                <button
                  type="button"
                  onClick={() => copyCode(code)}
                  title="Copiar"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-ink-200 text-ink-500 transition-colors hover:bg-surface-muted hover:text-ink-900"
                >
                  {copied === code ? (
                    <Check size={14} strokeWidth={2.5} className="text-status-claimed" />
                  ) : (
                    <Copy size={14} strokeWidth={2} />
                  )}
                </button>
              ) : null}
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-ink-400">
          {result && result.codes.length > previewCodes.length
            ? `+${formatNumber(result.codes.length - previewCodes.length)} mas en este batch. Descarga el CSV para la lista completa.`
            : "Los codigos reales se generaran al confirmar."}
        </p>
      </div>
    </div>
  );
}
