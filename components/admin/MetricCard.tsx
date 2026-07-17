import type { ReactNode } from "react";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

interface MetricCardProps {
  label: string;
  value: string;
  /** Muted secondary text (shown after the delta, or alone when no delta). */
  hint?: string;
  icon?: ReactNode;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  className?: string;
}

export function MetricCard({ label, value, hint, icon, delta, className }: MetricCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-ink-200 bg-white p-5 shadow-card transition-colors hover:border-ink-300",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        {icon ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-400">
            {icon}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-3xl font-bold leading-none tabular-nums tracking-tight text-ink-900">
        {value}
      </p>

      {delta || hint ? (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          {delta ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-semibold tabular-nums",
                delta.direction === "up"
                  ? "text-status-claimed"
                  : delta.direction === "down"
                  ? "text-status-invalid"
                  : "text-ink-400"
              )}
            >
              {delta.direction === "up" ? (
                <ArrowUp size={13} strokeWidth={2.5} />
              ) : delta.direction === "down" ? (
                <ArrowDown size={13} strokeWidth={2.5} />
              ) : (
                <Minus size={13} strokeWidth={2.5} />
              )}
              {delta.value}
            </span>
          ) : null}
          {hint ? <span className="text-ink-400">{hint}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
