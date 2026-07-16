"use client";

import { useCallback, useEffect, useState } from "react";
import { ImageIcon, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { getBrowserClient } from "@/lib/supabase/browser";
import { imageUpload } from "@/lib/config";
import type { Character } from "@/types";

const maxMb = Math.round(imageUpload.maxBytes / (1024 * 1024));

export function CharactersManager({ initialCharacters }: { initialCharacters: Character[] }) {
  // Seeded from the server render (page.tsx) so there is no client fetch on
  // mount that could momentarily fail auth and flash "No autorizado".
  const [items, setItems] = useState<Character[]>(initialCharacters);
  const [loading, setLoading] = useState(false);
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

  const [imgBusyId, setImgBusyId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  /** Any protected request that comes back 401 means the session expired. */
  function goLoginIfUnauthorized(status: number): boolean {
    if (status === 401) {
      window.location.href = "/login";
      return true;
    }
    return false;
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/characters");
      if (goLoginIfUnauthorized(res.status)) return;
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

  // Close the fullscreen image viewer with Escape.
  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

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
      if (goLoginIfUnauthorized(res.status)) return;
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
      if (goLoginIfUnauthorized(res.status)) return false;
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
      if (goLoginIfUnauthorized(res.status)) return;
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

  async function uploadImage(id: string, file: File) {
    // Validate on the client for instant feedback (Storage also enforces the cap).
    if (!(imageUpload.allowedTypes as readonly string[]).includes(file.type)) {
      setError("Formato no permitido (usa PNG, JPG, WEBP o GIF)");
      return;
    }
    if (file.size > imageUpload.maxBytes) {
      setError(`La imagen supera los ${maxMb} MB`);
      return;
    }

    setImgBusyId(id);
    setError(null);
    try {
      // 1. Ask the server for a signed upload ticket (admin-gated).
      const signRes = await fetch(`/api/characters/${id}/image/sign`, { method: "POST" });
      if (goLoginIfUnauthorized(signRes.status)) return;
      const ticket = await signRes.json().catch(() => ({}));
      if (!signRes.ok) {
        setError(ticket.error ?? "No se pudo preparar la subida");
        return;
      }

      // 2. Upload the file straight to Supabase Storage (no Vercel size limit).
      const { error: upErr } = await getBrowserClient()
        .storage.from(ticket.bucket)
        .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
      if (upErr) {
        setError("No se pudo subir la imagen");
        return;
      }

      // 3. Finalize: record the public URL on the character row.
      const finRes = await fetch(`/api/characters/${id}/image`, { method: "POST" });
      if (goLoginIfUnauthorized(finRes.status)) return;
      const finData = await finRes.json().catch(() => ({}));
      if (!finRes.ok) {
        setError(finData.error ?? "No se pudo guardar la imagen");
        return;
      }

      await load();
    } catch {
      setError("Error de red");
    } finally {
      setImgBusyId(null);
    }
  }

  async function removeImage(c: Character) {
    if (!window.confirm(`¿Quitar la imagen de "${c.name}"?`)) return;
    setImgBusyId(c.id);
    setError(null);
    try {
      const res = await fetch(`/api/characters/${c.id}/image`, { method: "DELETE" });
      if (goLoginIfUnauthorized(res.status)) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo quitar la imagen");
        return;
      }
      await load();
    } catch {
      setError("Error de red");
    } finally {
      setImgBusyId(null);
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
        <p className="mb-4 text-xs text-ink-400">
          La imagen de cada personaje se agrega en la tabla, después de crearlo.
        </p>
        {createMsg ? <p className="mb-4 text-sm text-ink-600">{createMsg}</p> : null}
        {error ? <p className="mb-4 text-sm text-status-invalid">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-ink-400">Cargando…</p>
        ) : (
          <>
            <Table>
              <THead>
                <TH>Imagen</TH>
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
                    <TD>
                      <div className="flex items-center gap-2.5">
                        {c.imageUrl ? (
                          <button
                            type="button"
                            onClick={() => setLightbox(c.imageUrl)}
                            title="Ver en pantalla completa"
                            className="shrink-0 overflow-hidden rounded-md border border-ink-200 transition hover:ring-2 hover:ring-accent/40"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={c.imageUrl} alt={c.name} className="h-11 w-11 object-cover" />
                          </button>
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-dashed border-ink-200 text-ink-300">
                            <ImageIcon size={16} strokeWidth={1.75} />
                          </div>
                        )}
                        <div className="flex flex-col items-start gap-0.5">
                          <label
                            className={`cursor-pointer text-xs font-medium text-accent hover:underline ${
                              imgBusyId === c.id ? "pointer-events-none opacity-50" : ""
                            }`}
                          >
                            {imgBusyId === c.id ? "Subiendo…" : c.imageUrl ? "Cambiar" : "Subir"}
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/gif"
                              className="hidden"
                              disabled={imgBusyId === c.id}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                e.target.value = "";
                                if (f) void uploadImage(c.id, f);
                              }}
                            />
                          </label>
                          {c.imageUrl ? (
                            <button
                              type="button"
                              onClick={() => removeImage(c)}
                              disabled={imgBusyId === c.id}
                              className="text-xs text-ink-400 transition hover:text-status-invalid disabled:opacity-50"
                            >
                              Quitar
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </TD>
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

      {lightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </Card>
  );
}
