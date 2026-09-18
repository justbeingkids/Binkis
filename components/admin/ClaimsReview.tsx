"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/format";
import type { CodeRecord } from "@/types";

/**
 * Review before shipping.
 *
 * A claim is a form submission, not proof that someone held a hologram: the
 * codes were printed from a plaintext file that circulated by email. Nothing
 * ships until a person looks at the row and approves it.
 */

type Filter = "pending" | "approved" | "rejected" | "all";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "pending", label: "Por revisar" },
  { key: "approved", label: "Aprobados" },
  { key: "rejected", label: "Rechazados" },
  { key: "all", label: "Todos" },
];

function statusBadge(status: CodeRecord["shippingStatus"]) {
  if (status === "approved") return <Badge tone="success">Aprobado</Badge>;
  if (status === "rejected") return <Badge tone="danger">Rechazado</Badge>;
  return <Badge tone="warning">Por revisar</Badge>;
}

export function ClaimsReview({ claims }: { claims: CodeRecord[] }) {
  const router = useRouter();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("pending");
  const [working, setWorking] = useState<string | null>(null);

  const rows = useMemo(
    () => claims.filter((c) => filter === "all" || (c.shippingStatus ?? "pending") === filter),
    [claims, filter]
  );
  const pendingCount = claims.filter((c) => (c.shippingStatus ?? "pending") === "pending").length;

  async function review(code: string, status: "approved" | "rejected") {
    setWorking(code);
    try {
      const res = await fetch("/api/admin/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("No se pudo guardar la revision", data.error);
        return;
      }
      toast.success(status === "approved" ? "Envio aprobado" : "Reclamo rechazado");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error de red");
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-100 px-5 py-3">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={
              filter === f.key
                ? "rounded-full bg-accent px-3 py-1 text-xs font-medium text-white"
                : "rounded-full border border-ink-200 px-3 py-1 text-xs font-medium text-ink-700 hover:bg-surface-muted"
            }
          >
            {f.label}
            {f.key === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1.5 text-xs text-ink-400">
          <ShieldAlert size={14} />
          Nada se envia hasta que alguien aprueba
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <EmptyState>No hay reclamos en este estado.</EmptyState>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Codigo</TH>
                <TH>Ganador</TH>
                <TH>Personaje</TH>
                <TH>Reclamado</TH>
                <TH>Estado</TH>
                <TH className="text-right">Accion</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((c) => (
                <TR key={c.code}>
                  <TD className="font-mono text-xs text-ink-900">{c.code}</TD>
                  <TD>
                    <div className="text-sm text-ink-900">{c.winnerName ?? "-"}</div>
                    <div className="text-xs text-ink-400">{c.winnerEmail ?? "-"}</div>
                    <div className="text-xs text-ink-400">{c.winnerAddress ?? "-"}</div>
                  </TD>
                  <TD className="text-sm">{c.characterName ?? "-"}</TD>
                  <TD className="text-xs text-ink-500">{formatDateTime(c.claimedAt)}</TD>
                  <TD>
                    {statusBadge(c.shippingStatus)}
                    {c.reviewedBy ? (
                      <div className="mt-1 text-xs text-ink-400">por {c.reviewedBy}</div>
                    ) : null}
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        loading={working === c.code}
                        disabled={working !== null || c.shippingStatus === "approved"}
                        onClick={() => review(c.code, "approved")}
                      >
                        <Check size={14} className="mr-1" />
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={working !== null || c.shippingStatus === "rejected"}
                        onClick={() => review(c.code, "rejected")}
                      >
                        <X size={14} className="mr-1" />
                        Rechazar
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </div>
  );
}
