import {
  Home,
  Code2,
  PlusSquare,
  Gift,
  Users,
  ShieldCheck,
  Trophy,
  Contact,
  ScanLine,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Single source of truth for the admin navigation. Both the desktop Sidebar
 * and the mobile drawer render from this array so the two never drift apart.
 * Order here is the order shown in the UI.
 */
export const navItems: NavItem[] = [
  { href: "/", label: "Resumen", icon: Home },
  { href: "/codes", label: "Codigos", icon: Code2 },
  { href: "/generate", label: "Generar", icon: PlusSquare },
  { href: "/lottery", label: "Sorteo", icon: Gift },
  { href: "/characters", label: "Personajes", icon: Users },
  { href: "/verify", label: "Verificar", icon: ShieldCheck },
  { href: "/winners", label: "Ganadores", icon: Trophy },
  { href: "/clientes", label: "Clientes", icon: Contact },
  { href: "/escaneos", label: "Escaneos", icon: ScanLine },
  { href: "/account", label: "Cuenta", icon: Settings },
];

/**
 * Whether `href` is the active route for `pathname`. The dashboard ("/") only
 * matches exactly; every other route matches on prefix so nested pages stay lit.
 */
export function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
