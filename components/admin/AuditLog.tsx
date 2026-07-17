"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { SpinnerBlock } from "@/components/ui/Spinner";
import { formatDateTime } from "@/lib/format";

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

const ACTION_LABELS: Record<string, string> = {
  login_success: "Login exitoso",
  login_failed: "Login fallido",
  created: "Creado",
  account_deleted: "Cuenta eliminada",
  email_changed: "Correo cambiado",
  password_changed: "Password cambiado",
  disabled: "Deshabilitado",
  enabled: "Habilitado",
};

function tone(action: string): "success" | "warning" | "danger" | "neutral" {
  if (action === "login_success" || action === "created" || action === "enabled") return "success";
  if (action === "login_failed" || action === "disabled" || action === "account_deleted") return "danger";
  if (action === "email_changed" || action === "password_changed") return "warning";
  return "neutral";
}

function location(country: string | null, city: string | null): string {
  const parts = [city, country].filter((p): p is string => !!p && p !== "Unknown");
  return parts.length ? parts.join(", ") : "-";
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
      <CardHeader>
        <CardTitle>Registro de actividad</CardTitle>
        <CardDescription>
          Inicios de sesión (éxito y fallo) y cambios de cuenta, con ubicación e IP.
        </CardDescription>
      </CardHeader>
      <CardBody>
        {canDelete && rows.length > 0 ? (
          <div className="mb-3 flex justify-end">
            <Button size="sm" variant="danger" loading={clearing} onClick={clearAll}>
              Limpiar registro
            </Button>
          </div>
        ) : null}

        {loading ? (
          <SpinnerBlock label="Cargando registro…" />
        ) : error ? (
          <p className="text-sm text-status-invalid">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-ink-400">Aún no hay eventos registrados.</p>
        ) : (
          <Table>
            <THead>
              <TH>Fecha</TH>
              <TH>Acción</TH>
              <TH>Cuenta</TH>
              <TH>Ubicación</TH>
              <TH className="hidden sm:table-cell">IP</TH>
              <TH className="hidden md:table-cell">Por</TH>
              {canDelete ? <TH className="text-right">·</TH> : null}
            </THead>
            <TBody>
              {rows.map((r, idx) => (
                <TR key={r.id} striped={idx % 2 === 1}>
                  <TD className="whitespace-nowrap text-ink-500 tabular-nums">{formatDateTime(r.ts)}</TD>
                  <TD>
                    <Badge tone={tone(r.action)}>{ACTION_LABELS[r.action] ?? r.action}</Badge>
                  </TD>
                  <TD className="break-all text-ink-900">{r.targetEmail ?? "-"}</TD>
                  <TD className="text-ink-600">{location(r.country, r.city)}</TD>
                  <TD className="hidden text-ink-400 tabular-nums sm:table-cell">{r.ip ?? "-"}</TD>
                  <TD className="hidden break-all text-ink-500 md:table-cell">{r.actorEmail ?? "-"}</TD>
                  {canDelete ? (
                    <TD className="text-right">
                      <button
                        type="button"
                        aria-label="Eliminar evento"
                        disabled={busyId === r.id}
                        onClick={() => deleteEntry(r.id)}
                        className="rounded p-1.5 text-ink-400 transition-colors hover:bg-status-invalidBg hover:text-status-invalid disabled:opacity-50"
                      >
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
                    </TD>
                  ) : null}
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardBody>
    </Card>
  );
}
