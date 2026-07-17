import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover disabled:bg-ink-300 disabled:cursor-not-allowed",
  secondary:
    "bg-white text-ink-900 border border-ink-200 hover:bg-surface-muted disabled:text-ink-400 disabled:cursor-not-allowed",
  ghost:
    "text-ink-700 hover:bg-surface-muted disabled:text-ink-400 disabled:cursor-not-allowed",
  danger:
    "bg-status-invalid text-white hover:opacity-90 disabled:bg-ink-300 disabled:cursor-not-allowed",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, disabled, className, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-base",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? <Spinner size={16} /> : null}
      {children}
    </button>
  );
});
