import { cn } from "@/lib/cn";

interface SpinnerProps {
  /** Diameter in px. Default 16. */
  size?: number;
  className?: string;
  /** Screen-reader label. */
  label?: string;
}

/**
 * The single, reusable spinner.
 *
 * Colour comes from `border-current`, so it inherits the surrounding text colour
 * (white inside a primary button, ink on a page, etc.). Override with `className`
 * (e.g. `className="text-accent"`) when you need a specific colour.
 *
 * Use it inline (inside buttons, next to text) or via <SpinnerBlock /> to fill a
 * whole loading area.
 */
export function Spinner({ size = 16, className, label = "Cargando" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      style={{ width: size, height: size }}
      className={cn(
        "inline-block shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent align-[-0.125em]",
        className
      )}
    />
  );
}

/**
 * Centered spinner with an optional message — for loading a whole list, card,
 * table, or page section.
 */
export function SpinnerBlock({
  label = "Cargando…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2.5 py-12 text-sm text-ink-400",
        className
      )}
    >
      <Spinner size={18} />
      {label ? <span>{label}</span> : null}
    </div>
  );
}
