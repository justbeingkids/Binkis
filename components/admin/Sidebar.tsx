"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Hash,
  PlusSquare,
  Trophy,
  ShieldCheck,
  Dices,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const overviewItems: NavItem[] = [
  { href: "/", label: "Resumen", icon: LayoutDashboard },
  { href: "/account", label: "Mi cuenta", icon: UserCog },
];

const codesItems: NavItem[] = [
  { href: "/codes", label: "Codigos", icon: Hash },
  { href: "/generate", label: "Generar", icon: PlusSquare },
  { href: "/lottery", label: "Sorteo", icon: Dices },
  { href: "/verify", label: "Verificar", icon: ShieldCheck },
  { href: "/winners", label: "Ganadores", icon: Trophy },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-surface-muted text-ink-900"
          : "text-ink-500 hover:bg-surface-muted hover:text-ink-900"
      )}
    >
      {active ? (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-amber" />
      ) : null}
      <Icon
        size={15}
        strokeWidth={2}
        className={active ? "text-ink-900" : "text-ink-400 group-hover:text-ink-700"}
      />
      <span>{item.label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-ink-200 bg-white md:flex">
      <div className="flex h-16 shrink-0 items-center border-b border-ink-200 px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-white shadow-soft">
            <span className="font-mono text-[11px] font-bold tracking-tighter">BK</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight text-ink-900">BinKis</span>
            <span className="text-[10px] uppercase tracking-wider text-ink-400">Validacion</span>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto p-3">
        <div className="flex flex-col gap-0.5">
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-400">
            General
          </p>
          {overviewItems.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </div>

        <div className="flex flex-col gap-0.5">
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-400">
            Codigos
          </p>
          {codesItems.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </div>
      </nav>

      <div className="border-t border-ink-200 p-3">
        <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-400">
          Conexion
        </p>
        <div className="flex flex-col gap-1.5 px-3 py-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-500">Google Sheet</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-status-claimed" />
              <span className="text-[11px] font-medium text-status-claimed">Activo</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-500">Coleccion</span>
            <span className="text-[11px] font-medium text-ink-700">No.777</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-500">Edicion</span>
            <span className="text-[11px] font-medium text-ink-700">Limitada</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
