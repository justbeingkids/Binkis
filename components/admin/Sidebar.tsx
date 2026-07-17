"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, ChevronDown, LogOut } from "lucide-react";
import { cn } from "@/lib/cn";
import { navItems, isActivePath } from "@/lib/nav";
import { publicEnv } from "@/lib/env";

function initialsFromEmail(email: string | null | undefined): string {
  if (!email) return "AD";
  const name = email.split("@")[0] ?? email;
  const parts = name.split(/[.\-_]+/).filter(Boolean);
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  return letters.toUpperCase();
}

function displayName(email: string | null | undefined): string {
  if (!email) return "Administrador";
  const name = email.split("@")[0] ?? email;
  return name
    .split(/[.\-_]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}

export function Sidebar({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    try {
      await fetch("/api/admin/login", { method: "DELETE" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-ink-200 bg-white transition-[width] duration-200 md:flex",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center justify-between px-5">
        {!collapsed ? (
          <Link href="/" className="text-lg font-bold tracking-tight text-ink-900">
            {publicEnv.NEXT_PUBLIC_BRAND_NAME}
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expandir menu" : "Colapsar menu"}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-400 transition-colors hover:bg-surface-muted hover:text-ink-700",
            collapsed && "mx-auto"
          )}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-surface-muted text-ink-900"
                  : "text-ink-500 hover:bg-surface-muted hover:text-ink-900"
              )}
            >
              <Icon
                size={19}
                strokeWidth={2}
                className={cn("shrink-0", active ? "text-ink-900" : "text-ink-400 group-hover:text-ink-700")}
              />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="relative border-t border-ink-200 p-3">
        {menuOpen && !collapsed ? (
          <div className="absolute bottom-full left-3 right-3 mb-1 rounded-lg border border-ink-200 bg-white p-1 shadow-elevated">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-status-invalid transition-colors hover:bg-status-invalidBg"
            >
              <LogOut size={15} strokeWidth={2} />
              Cerrar sesion
            </button>
          </div>
        ) : null}
        {collapsed ? (
          <button
            type="button"
            onClick={handleLogout}
            title="Cerrar sesion"
            className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-ink-900 text-xs font-semibold text-white"
          >
            {initialsFromEmail(userEmail)}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-surface-muted"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900 text-xs font-semibold text-white">
              {initialsFromEmail(userEmail)}
            </span>
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-sm font-medium text-ink-900">{displayName(userEmail)}</span>
              <span className="truncate text-xs text-ink-400">{userEmail ?? "Sesion activa"}</span>
            </span>
            <ChevronDown
              size={16}
              className={cn("shrink-0 text-ink-400 transition-transform", menuOpen && "rotate-180")}
            />
          </button>
        )}
      </div>
    </aside>
  );
}
