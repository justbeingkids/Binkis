"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import type { Character } from "@/types";

export function CharactersManager() {
  const [items, setItems] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newQuota, setNewQuota] = useState("");
  const [newWeight, setNewWeight] = useState("1");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editQuota, setEditQuota] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/characters");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo cargar la lista");
        return;
      }
      setItems(data.characters ?? []);
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateMsg(null);
    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          quota: Number(newQuota) || 0,
          weight: Number(newWeight) || 1,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateMsg(data.error ?? "No se pudo crear");
        return;
      }
      setNewName("");
      setNewQuota("");
      setNewWeight("1");
      setCreateMsg("Personaje agregado.");
      await load();
    } catch {
      setCreateMsg("Error de red");
    } finally {
      setCreating(false);
    }
  }

  async function patch(id: string, payload: Record<string, unknown>): Promise<boolean> {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/characters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo actualizar");
        return false;
      }
      await load();
      return true;
    } catch {
      setError("Error de red");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function removeItem(c: Character) {
    if (!window.confirm(`¿Eliminar el personaje "${c.name}"?`)) return;
    setBusyId(c.id);
    setError(null);
    try {
      const res = await fetch(`/api/characters/${c.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo eliminar");
        return;
      }
      await load();
    } catch {
      setError("Error de red");
    } finally {
      setBusyId(null);
    }
  }

  async function saveEdit(id: string) {
    const payload: Record<string, unknown> = {};
    if (editName.trim()) payload.name = editName.trim();
    const q = Number(editQuota);
    if (editQuota !== "" && Number.isInteger(q) && q >= 0) payload.quota = q;
    const w = Number(editWeight);
    if (editWeight !== "" && Number.isFinite(w) && w >= 0) payload.weight = w;
    if (Object.keys(payload).length === 0) {
      setEditingId(null);
      return;
    }
    const ok = await patch(id, payload);
    if (ok) setEditingId(null);
  }

  const totalQuota = items.reduce((s, c) => s + c.quota, 0);
  const totalAssigned = items.reduce((s, c) => s + c.assignedCount, 0);
  const totalRemaining = items.reduce((s, c) => s + c.remaining, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personajes (Limited Edition)</CardTitle>
        <CardDescription>
          Ajusta la cantidad y el peso de cada personaje. La probabilidad se recalcula
          automáticamente con cada asignación.
        </CardDescription>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleCreate} className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Nombre"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              disabled={creating}
            />
          </div>
          <div className="w-full sm:w-28">
            <Input
              label="Cantidad"
              type="number"
              min={0}
              value={newQuota}
              onChange={(e) => setNewQuota(e.target.value)}
              required
              disabled={creating}
            />
          </div>
          <div className="w-full sm:w-24">
            <Input
              label="Peso"
              type="number"
              min={0}
              step="0.1"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              disabled={creating}
            />
          </div>
          <Button type="submit" loading={creating} className="w-full sm:w-auto">
            Agregar
          </Button>
        </form>
        {createMsg ? <p className="mb-4 text-sm text-ink-600">{createMsg}</p> : null}
        {error ? <p className="mb-4 text-sm text-status-invalid">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-ink-400">Cargando…</p>
        ) : (
          <>
            <Table>
              <THead>
                <TH>Personaje</TH>
                <TH>Cantidad</TH>
                <TH className="hidden sm:table-cell">Asignados</TH>
                <TH>Restantes</TH>
                <TH>Peso</TH>
                <TH>Probabilidad</TH>
                <TH className="hidden md:table-cell">Estado</TH>
                <TH className="text-right">Acciones</TH>
              </THead>
              <TBody>
                {items.map((c, idx) => (
                  <TR key={c.id} striped={idx % 2 === 1}>
                    <TD className="font-medium text-ink-900">
                      {editingId === c.id ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-36"
                        />
                      ) : (
                        <span className="break-all">{c.name}</span>
                      )}
                    </TD>
                    <TD className="tabular-nums">
                      {editingId === c.id ? (
                        <Input
                          type="number"
                          min={0}
                          value={editQuota}
                          onChange={(e) => setEditQuota(e.target.value)}
                          className="w-20"
                        />
                      ) : (
                        c.quota
                      )}
                    </TD>
                    <TD className="hidden text-ink-500 tabular-nums sm:table-cell">{c.assignedCount}</TD>
                    <TD className="tabular-nums">{c.remaining}</TD>
                    <TD className="tabular-nums">
                      {editingId === c.id ? (
                        <Input
                          type="number"
                          min={0}
                          step="0.1"
                          value={editWeight}
                          onChange={(e) => setEditWeight(e.target.value)}
                          className="w-20"
                        />
                      ) : (
                        c.weight
                      )}
                    </TD>
                    <TD className="tabular-nums text-ink-700">{(c.winProbability * 100).toFixed(1)}%</TD>
                    <TD className="hidden md:table-cell">
                      {c.active ? (
                        <Badge tone="success">Activo</Badge>
                      ) : (
                        <Badge tone="neutral">Inactivo</Badge>
                      )}
                    </TD>
                    <TD className="text-right">
                      {editingId === c.id ? (
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button size="sm" loading={busyId === c.id} onClick={() => saveEdit(c.id)}>
                            Guardar
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditingId(c.id);
                              setEditName(c.name);
                              setEditQuota(String(c.quota));
                              setEditWeight(String(c.weight));
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={busyId === c.id}
                            onClick={() => patch(c.id, { active: !c.active })}
                          >
                            {c.active ? "Desactivar" : "Activar"}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            loading={busyId === c.id}
                            onClick={() => removeItem(c)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <p className="mt-3 text-xs text-ink-400">
              Total: {totalQuota} en inventario · {totalAssigned} asignados · {totalRemaining} restantes
            </p>
          </>
        )}
      </CardBody>
    </Card>
  );
}
