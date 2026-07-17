"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Gift, ShieldCheck, AlertTriangle, Minus, Plus, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatNumber } from "@/lib/format";

interface LotteryPanelProps {
  currentTotal: number;
  currentWinners: number;
  step?: number;
}

interface LotteryResult {
  selected: number;
  alreadyWinners: number;
  remainingAvailable: number;
}

export function LotteryPanel({ currentTotal, currentWinners, step = 100 }: LotteryPanelProps) {
  const router = useRouter();
  const toast = useToast();
  const [winnerCount, setWinnerCount] = useState(Math.min(4000, Math.max(1, currentTotal)));
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<LotteryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function adjust(delta: number) {
    setWinnerCount((v) => Math.max(1, v + delta));
  }

  async function executeLottery() {
    setError(null);
    setRunning(true);
    try {
      const res = await fetch("/api/lottery/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winnerCount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error en sorteo");
        toast.error(data.error ?? "Error en sorteo");
        return;
      }
      setResult({
        selected: data.selected,
        alreadyWinners: data.alreadyWinners,
        remainingAvailable: data.remainingAvailable,
      });
      toast.success(
        `Sorteo ejecutado: ${formatNumber(data.selected)} ganadores nuevos`,
        `Ya habia ${formatNumber(data.alreadyWinners)} ganadores antes`
      );
      startTransition(() => router.refresh());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error en sorteo";
      setError(message);
      toast.error(message);
    } finally {
      setRunning(false);
      setConfirming(false);
    }
  }

  const noCodes = currentTotal === 0;
  const enoughCodes = currentTotal >= winnerCount;
  const blocked = noCodes || !enoughCodes;

  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-brand/30 bg-brand-soft text-brand">
        <Gift size={24} strokeWidth={2} />
      </div>
      <h2 className="mt-4 text-xl font-semibold tracking-tight text-ink-900">Ejecutar sorteo</h2>
      <p className="mt-1.5 max-w-md text-sm text-ink-500">
        El sorteo seleccionara al azar codigos disponibles y los marcara como ganadores.
      </p>

      <p className="mt-6 text-[11px] font-semibold uppercase tracking-widest text-ink-400">
        Numero de ganadores
      </p>
      <div className="mt-1 text-4xl font-bold tabular-nums text-ink-900">{formatNumber(winnerCount)}</div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => adjust(-step)}
          disabled={running || winnerCount <= 1}
          aria-label="Reducir"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 text-ink-600 transition-colors hover:bg-surface-muted disabled:opacity-40"
        >
          <Minus size={16} strokeWidth={2.5} />
        </button>
        <input
          type="number"
          min={1}
          value={winnerCount}
          onChange={(e) => setWinnerCount(Math.max(1, Number(e.target.value) || 1))}
          disabled={running}
          className="h-9 w-24 rounded-lg border border-ink-200 bg-white text-center text-sm font-medium tabular-nums text-ink-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand/15"
        />
        <button
          type="button"
          onClick={() => adjust(step)}
          disabled={running}
          aria-label="Aumentar"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 text-ink-600 transition-colors hover:bg-surface-muted disabled:opacity-40"
        >
          <Plus size={16} strokeWidth={2.5} />
        </button>
      </div>

      {blocked ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-status-invalid/20 bg-status-invalidBg px-3.5 py-2.5 text-left text-xs text-ink-700">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-status-invalid" strokeWidth={2} />
          <span>
            {noCodes
              ? "No hay codigos en la base. Genera codigos primero."
              : `Pediste ${formatNumber(winnerCount)} ganadores pero solo hay ${formatNumber(currentTotal)} codigos.`}
          </span>
        </div>
      ) : null}

      {!confirming ? (
        <Button
          type="button"
          size="lg"
          onClick={() => setConfirming(true)}
          disabled={blocked || running}
          className="mt-5 w-full max-w-xs gap-2"
        >
          <Gift size={17} strokeWidth={2.25} />
          Ejecutar sorteo
        </Button>
      ) : (
        <div className="mt-5 w-full max-w-md rounded-xl border border-amber-ring/30 bg-amber-soft px-4 py-4 text-left">
          <div className="flex items-start gap-2.5 text-xs text-ink-700">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber" strokeWidth={2} />
            <div>
              <p className="font-semibold text-ink-900">Confirmar sorteo</p>
              <p className="mt-1">
                Se marcaran aleatoriamente {formatNumber(winnerCount)} codigos como ganadores.
                {currentWinners > 0
                  ? ` Ya hay ${formatNumber(currentWinners)} ganadores; el sistema completa hasta el numero pedido (no resetea).`
                  : " Esta accion no se puede deshacer facilmente."}
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button type="button" onClick={executeLottery} loading={running} variant="danger">
              Si, ejecutar
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirming(false)} disabled={running}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-400">
        <Info size={13} strokeWidth={2} />
        Solo se seleccionaran codigos en estado Disponible.
      </p>

      {error ? <p className="mt-3 text-xs text-status-invalid">{error}</p> : null}

      {result ? (
        <div className="mt-4 w-full max-w-md rounded-xl border border-status-claimed/20 bg-status-claimedBg px-4 py-3 text-left">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-status-claimed" strokeWidth={2.5} />
            <p className="text-sm font-semibold text-ink-900">Sorteo completado</p>
          </div>
          <p className="mt-1 text-xs text-ink-700">
            {formatNumber(result.selected)} codigos nuevos marcados como ganadores. Quedan{" "}
            {formatNumber(result.remainingAvailable)} disponibles para futuros sorteos.
          </p>
        </div>
      ) : null}
    </div>
  );
}
