"use client";

import { useCallback, useEffect, useState, type ComponentType } from "react";
import {
  LogIn,
  LogOut,
  ShieldAlert,
  UserPlus,
  UserX,
  UserCheck,
  AtSign,
  Lock,
  Activity,
  Trash2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { SpinnerBlock } from "@/components/ui/Spinner";

interface AuditRow {
  id: string;
  ts: string;
  actorEmail: string | null;
  action: string;
  targetEmail: string | null;
  ip: string | null;
  country: string | null;
  city: string | null;
}

interface ActionMeta {
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  tint: string;
}

const ACTIONS: Record<string, ActionMeta> = {
  login_success: { label: "Sesión iniciada", icon: LogIn, tint: "text-status-claimed" },
  login_failed: { label: "Inicio fallido", icon: ShieldAlert, tint: "text-status-invalid" },
  created: { label: "Usuario creado", icon: UserPlus, tint: "text-status-claimed" },
  account_deleted: { label: "Cuenta eliminada", icon: UserX, tint: "text-status-invalid" },
  email_changed: { label: "Correo actualizado", icon: AtSign, tint: "text-amber" },
  password_changed: { label: "Contraseña actualizada", icon: Lock, tint: "text-amber" },
  disabled: { label: "Usuario deshabilitado", icon: UserX, tint: "text-status-invalid" },
  enabled: { label: "Usuario habilitado", icon: UserCheck, tint: "text-status-claimed" },
  logout: { label: "Sesión cerrada", icon: LogOut, tint: "text-ink-500" },
};

function metaFor(action: string): ActionMeta {
  return ACTIONS[action] ?? { label: action, icon: Activity, tint: "text-ink-500" };
}

/** Client-side relative time (component is client-only, so no hydration issue). */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "-";
  const diffMin = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (diffMin < 1) return "hace un momento";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `hace ${diffHr} h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "ayer";
  if (diffDay < 7) return `hace ${diffDay} d`;
  return new Date(iso).toLocaleDateString();
}

function location(country: string | null, city: string | null): string {
  const parts = [city, country].filter((p): p is string => !!p && p !== "Unknown");
  return parts.length ? parts.join(", ") : "";
}

export function AuditLog() {
  const toast = useToast();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/audit");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo cargar el registro");
        return;
      }
      setRows(data.entries ?? []);
      setCanDelete(!!data.canDelete);
      setError(null);
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function deleteEntry(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/audit/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error("No se pudo eliminar", data.error);
        return;
      }
      setRows((rs) => rs.filter((r) => r.id !== id));
      toast.success("Evento eliminado");
    } catch {
      toast.error("Error de red", "No se pudo eliminar");
    } finally {
      setBusyId(null);
    }
  }

  async function clearAll() {
    if (!window.confirm("¿Borrar TODO el registro de actividad? Esta acción no se puede deshacer.")) {
      return;
    }
    setClearing(true);
    try {
      const res = await fetch("/api/admin/audit", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error("No se pudo limpiar el registro", data.error);
        return;
      }
      setRows([]);
      toast.success("Registro limpiado");
    } catch {
      toast.error("Error de red", "No se pudo limpiar el registro");
    } finally {
      setClearing(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-3">
        <CardTitle>Actividad reciente</CardTitle>
        {canDelete && rows.length > 0 ? (
          <Button size="sm" variant="ghost" loading={clearing} onClick={clearAll} className="text-ink-500">
            Limpiar registro
          </Button>
        ) : null}
      </CardHeader>
      <CardBody className="p-0">
        {loading ? (
          <SpinnerBlock label="Cargando registro…" />
        ) : error ? (
          <p className="px-6 py-4 text-sm text-status-invalid">{error}</p>
        ) : rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-ink-400">Aún no hay eventos registrados.</p>
        ) : (
          <ul>
            {rows.map((r) => {
              const meta = metaFor(r.action);
              const Icon = meta.icon;
              const loc = location(r.country, r.city);
              return (
                <li
                  key={r.id}
                  className="group flex items-center gap-4 border-b border-ink-50 px-6 py-3.5 last:border-0 hover:bg-surface-muted/40"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted">
                    <Icon size={16} strokeWidth={2} className={meta.tint} />
                  </span>

                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">
                    {meta.label}
                  </span>

                  <span className="hidden w-56 shrink-0 truncate text-sm text-ink-500 md:block">
                    {r.targetEmail ?? r.actorEmail ?? "-"}
                  </span>

                  <span className="hidden w-24 shrink-0 whitespace-nowrap text-right text-sm text-ink-500 sm:block">
                    {relativeTime(r.ts)}
                  </span>

                  <span className="hidden w-56 shrink-0 truncate text-right text-xs text-ink-400 lg:block">
                    {loc && r.ip ? `${loc} · ${r.ip}` : loc || r.ip || ""}
                  </span>

                  {canDelete ? (
                    <button
                      type="button"
                      aria-label="Eliminar evento"
                      disabled={busyId === r.id}
                      onClick={() => deleteEntry(r.id)}
                      className="shrink-0 rounded p-1.5 text-ink-300 opacity-0 transition hover:bg-status-invalidBg hover:text-status-invalid group-hover:opacity-100 disabled:opacity-50"
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
