"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { cn } from "@/lib/cn";
import { navItems, isActivePath } from "@/lib/nav";
import { publicEnv } from "@/lib/env";

function Brand({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white">
        <span className="font-mono text-[10px] font-bold">BK</span>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-ink-900">{publicEnv.NEXT_PUBLIC_BRAND_NAME}</span>
        {size === "md" ? (
          <span className="text-[9px] uppercase tracking-wider text-ink-400">
            Coleccion No.{publicEnv.NEXT_PUBLIC_COLLECTION_NUMBER}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/admin/login", { method: "DELETE" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

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

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-ink-200 bg-white px-4 md:hidden">
        <Link href="/">
          <Brand size="md" />
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
          <nav className="absolute left-0 top-0 flex h-full w-72 max-w-[80vw] flex-col bg-white shadow-elevated">
            <div className="flex h-14 items-center justify-between border-b border-ink-200 px-4">
              <Brand />
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
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                      active
                        ? "bg-surface-muted text-ink-900"
                        : "text-ink-500 hover:bg-surface-muted hover:text-ink-900"
                    )}
                  >
                    <Icon size={18} strokeWidth={2} className={active ? "text-ink-900" : "text-ink-400"} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="border-t border-ink-200 p-3">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-status-invalid hover:bg-status-invalidBg"
              >
                <LogOut size={18} strokeWidth={2} />
                <span>Cerrar sesion</span>
              </button>
            </div>
          </nav>
        </div>
      ) : null}
    </>
  );
}
