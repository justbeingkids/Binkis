import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

interface TopbarProps {
  title: string;
  description?: string;
  action?: ReactNode;
  meta?: ReactNode;
  className?: string;
  /** Optional crumb shown between "Inicio" and the page title. */
  breadcrumb?: string;
}

export function Topbar({ title, description, action, meta, className, breadcrumb }: TopbarProps) {
  return (
    <header
      className={cn(
        "flex shrink-0 flex-col gap-4 px-4 py-5 sm:px-6 md:flex-row md:items-start md:justify-between lg:px-8",
        className
      )}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">{title}</h1>
        <nav className="flex items-center gap-1 text-sm text-ink-400" aria-label="Ruta">
          <Link href="/" className="hover:text-ink-700">
            Inicio
          </Link>
          {breadcrumb ? (
            <>
              <ChevronRight size={14} className="text-ink-300" />
              <span>{breadcrumb}</span>
            </>
          ) : null}
          <ChevronRight size={14} className="text-ink-300" />
          <span className="text-ink-500">{title}</span>
        </nav>
        {description ? (
          <p className="max-w-xl text-sm leading-relaxed text-ink-500">{description}</p>
        ) : null}
        {meta ? <div className="mt-1 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </header>
  );
}
