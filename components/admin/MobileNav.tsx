"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  Hash,
  PlusSquare,
  ShieldCheck,
  Trophy,
  Dices,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const navItems: NavItem[] = [
  { href: "/", label: "Resumen", icon: LayoutDashboard },
  { href: "/account", label: "Mi cuenta", icon: UserCog },
  { href: "/codes", label: "Codigos", icon: Hash },
  { href: "/generate", label: "Generar", icon: PlusSquare },
  { href: "/lottery", label: "Sorteo", icon: Dices },
  { href: "/verify", label: "Verificar", icon: ShieldCheck },
  { href: "/winners", label: "Ganadores", icon: Trophy },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-ink-200 bg-white px-4 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white">
            <span className="font-mono text-[10px] font-bold">BK</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-ink-900">BinKis</span>
            <span className="text-[9px] uppercase tracking-wider text-ink-400">Validacion</span>
          </div>
        </Link>
        <button
          type="button"
          aria-label={open ? "Cerrar menu" : "Abrir menu"}
          onClick={() => setOpen((v) => !v)}
          className="rounded-md border border-ink-200 p-2 text-ink-700 hover:bg-surface-muted"
        >
          {open ? <X size={16} strokeWidth={2.5} /> : <Menu size={16} strokeWidth={2.5} />}
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Cerrar menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink-900/40"
          />
          <nav className="absolute left-0 top-0 flex h-full w-72 max-w-[80vw] flex-col bg-white shadow-soft">
            <div className="flex h-14 items-center justify-between border-b border-ink-200 px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white">
                  <span className="font-mono text-[10px] font-bold">BK</span>
                </div>
                <span className="text-sm font-semibold text-ink-900">BinKis</span>
              </div>
              <button
                type="button"
                aria-label="Cerrar menu"
                onClick={() => setOpen(false)}
                className="rounded-md p-2 text-ink-500 hover:bg-surface-muted hover:text-ink-900"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium",
                      active
                        ? "bg-surface-muted text-ink-900"
                        : "text-ink-700 hover:bg-surface-muted"
                    )}
                  >
                    <Icon size={16} strokeWidth={2} className={active ? "text-ink-900" : "text-ink-400"} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="border-t border-ink-200 px-4 py-3">
              <p className="text-xs font-semibold text-ink-900">Coleccion 777</p>
              <p className="text-[10px] uppercase tracking-wider text-ink-400">Edicion Limitada</p>
            </div>
          </nav>
        </div>
      ) : null}
    </>
  );
}
