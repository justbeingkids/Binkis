"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { formatDateTime } from "@/lib/format";

interface AuditRow {
  id: string;
  ts: string;
  actorEmail: string | null;
  action: string;
  targetEmail: string | null;
  ip: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  created: "Creado",
  email_changed: "Correo cambiado",
  password_changed: "Password cambiado",
  disabled: "Deshabilitado",
  enabled: "Habilitado",
};

function tone(action: string): "success" | "warning" | "danger" | "neutral" {
  if (action === "created" || action === "enabled") return "success";
  if (action === "disabled") return "danger";
  return "warning";
}

export function AuditLog() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/audit");
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "No se pudo cargar el registro");
          return;
        }
        setRows(data.entries ?? []);
      } catch {
        if (!cancelled) setError("Error de red");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registro de actividad</CardTitle>
        <CardDescription>Quién creó, cambió o deshabilitó cada cuenta admin.</CardDescription>
      </CardHeader>
      <CardBody>
        {loading ? (
          <p className="text-sm text-ink-400">Cargando…</p>
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
              <TH>Realizado por</TH>
              <TH>IP</TH>
            </THead>
            <TBody>
              {rows.map((r, idx) => (
                <TR key={r.id} striped={idx % 2 === 1}>
                  <TD className="text-ink-500 tabular-nums">{formatDateTime(r.ts)}</TD>
                  <TD>
                    <Badge tone={tone(r.action)}>{ACTION_LABELS[r.action] ?? r.action}</Badge>
                  </TD>
                  <TD className="text-ink-900">{r.targetEmail ?? "-"}</TD>
                  <TD className="text-ink-500">{r.actorEmail ?? "-"}</TD>
                  <TD className="text-ink-400 tabular-nums">{r.ip ?? "-"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardBody>
    </Card>
  );
}
