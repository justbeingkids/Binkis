"use client";

import { useCallback, useEffect, useState } from "react";
import { ImageIcon, X, Pencil, Trash2, Plus, Upload } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { getBrowserClient } from "@/lib/supabase/browser";
import { imageUpload } from "@/lib/config";
import { formatNumber } from "@/lib/format";
import type { Character } from "@/types";

const maxMb = Math.round(imageUpload.maxBytes / (1024 * 1024));

export function CharactersManager({ initialCharacters }: { initialCharacters: Character[] }) {
  const toast = useToast();
  const [items, setItems] = useState<Character[]>(initialCharacters);
  const [error, setError] = useState<string | null>(null);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newQuota, setNewQuota] = useState("");
  const [newWeight, setNewWeight] = useState("1");
  const [creating, setCreating] = useState(false);

  // Edit dialog
  const [editing, setEditing] = useState<Character | null>(null);
  const [editName, setEditName] = useState("");
  const [editQuota, setEditQuota] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [imgBusyId, setImgBusyId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  function goLoginIfUnauthorized(status: number): boolean {
    if (status === 401) {
      window.location.href = "/login";
      return true;
    }
    return false;
  }

  const load = useCallback(async () => {
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
    }
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, quota: Number(newQuota) || 0, weight: Number(newWeight) || 1 }),
      });
      if (goLoginIfUnauthorized(res.status)) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("No se pudo crear el personaje", data.error);
        return;
      }
      setNewName("");
      setNewQuota("");
      setNewWeight("1");
      setShowCreate(false);
      await load();
      toast.success("Personaje creado");
      // The row was created; a failed odds refresh is a caveat, not a failure.
      if (data.warning) {
        toast.info("No se recalcularon las probabilidades", data.warning);
      }
    } catch {
      toast.error("Error de red", "No se pudo crear el personaje");
    } finally {
      setCreating(false);
    }
  }

  async function patch(id: string, payload: Record<string, unknown>): Promise<boolean> {
    setBusyId(id);
    try {
      const res = await fetch(`/api/characters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (goLoginIfUnauthorized(res.status)) return false;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("No se pudo actualizar", data.error);
        return false;
      }
      await load();
      if (data.warning) toast.info("No se recalcularon las probabilidades", data.warning);
      return true;
    } catch {
      toast.error("Error de red", "No se pudo actualizar");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function removeItem(c: Character) {
    if (!window.confirm(`¿Eliminar el personaje "${c.name}"?`)) return;
    setBusyId(c.id);
    try {
      const res = await fetch(`/api/characters/${c.id}`, { method: "DELETE" });
      if (goLoginIfUnauthorized(res.status)) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("No se pudo eliminar", data.error);
        return;
      }
      await load();
      toast.success("Personaje eliminado");
    } catch {
      toast.error("Error de red", "No se pudo eliminar");
    } finally {
      setBusyId(null);
    }
  }

  async function uploadImage(id: string, file: File) {
    if (!(imageUpload.allowedTypes as readonly string[]).includes(file.type)) {
      toast.error("Formato no permitido", "Usa PNG, JPG, WEBP o GIF");
      return;
    }
    if (file.size > imageUpload.maxBytes) {
      toast.error("Imagen demasiado grande", `El máximo es ${maxMb} MB`);
      return;
    }
    setImgBusyId(id);
    try {
      const signRes = await fetch(`/api/characters/${id}/image/sign`, { method: "POST" });
      if (goLoginIfUnauthorized(signRes.status)) return;
      const ticket = await signRes.json().catch(() => ({}));
      if (!signRes.ok) {
        toast.error("No se pudo subir la imagen", ticket.error ?? "Error al preparar la subida");
        return;
      }
      const { error: upErr } = await getBrowserClient()
        .storage.from(ticket.bucket)
        .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
      if (upErr) {
        toast.error("No se pudo subir la imagen");
        return;
      }
      const finRes = await fetch(`/api/characters/${id}/image`, { method: "POST" });
      if (goLoginIfUnauthorized(finRes.status)) return;
      const finData = await finRes.json().catch(() => ({}));
      if (!finRes.ok) {
        toast.error("No se pudo guardar la imagen", finData.error);
        return;
      }
      await load();
      toast.success("Imagen actualizada");
    } catch {
      toast.error("Error de red", "No se pudo subir la imagen");
    } finally {
      setImgBusyId(null);
    }
  }

  async function removeImage(c: Character) {
    if (!window.confirm(`¿Quitar la imagen de "${c.name}"?`)) return;
    setImgBusyId(c.id);
    try {
      const res = await fetch(`/api/characters/${c.id}/image`, { method: "DELETE" });
      if (goLoginIfUnauthorized(res.status)) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("No se pudo quitar la imagen", data.error);
        return;
      }
      await load();
      toast.success("Imagen eliminada");
    } catch {
      toast.error("Error de red", "No se pudo quitar la imagen");
    } finally {
      setImgBusyId(null);
    }
  }

  function openEdit(c: Character) {
    setEditing(c);
    setEditName(c.name);
    setEditQuota(String(c.quota));
    setEditWeight(String(c.weight));
    setEditActive(c.active);
  }

  async function saveEdit() {
    if (!editing) return;
    const payload: Record<string, unknown> = { active: editActive };
    if (editName.trim()) payload.name = editName.trim();
    const q = Number(editQuota);
    if (editQuota !== "" && Number.isInteger(q) && q >= 0) payload.quota = q;
    const w = Number(editWeight);
    if (editWeight !== "" && Number.isFinite(w) && w >= 0) payload.weight = w;
    const ok = await patch(editing.id, payload);
    if (ok) {
      setEditing(null);
      toast.success("Cambios guardados");
    }
  }

  const maxProb = items.reduce((m, c) => Math.max(m, c.winProbability), 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">
          {formatNumber(items.length)} personaje{items.length === 1 ? "" : "s"} en la coleccion
        </p>
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <Plus size={16} strokeWidth={2.5} />
          Anadir personaje
        </Button>
      </div>

      {error ? <p className="text-sm text-status-invalid">{error}</p> : null}

      <div className="min-h-0 flex-1 overflow-y-auto pb-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-ink-200 py-16 text-center">
            <ImageIcon size={22} className="text-ink-300" strokeWidth={1.75} />
            <p className="text-sm text-ink-400">Aun no hay personajes. Anade el primero.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((c) => {
              const pct = (c.winProbability * 100).toFixed(2);
              const barWidth = maxProb > 0 ? (c.winProbability / maxProb) * 100 : 0;
              return (
                <div
                  key={c.id}
                  className="group flex flex-col rounded-xl border border-ink-200 bg-white p-3 shadow-card transition-colors hover:border-ink-300"
                >
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-surface-muted">
                    {c.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.imageUrl}
                        alt={c.name}
                        className="h-full w-full cursor-zoom-in object-cover"
                        onClick={() => setLightbox(c.imageUrl)}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-ink-300">
                        <ImageIcon size={26} strokeWidth={1.5} />
                      </div>
                    )}

                    {/* Upload-in-progress overlay */}
                    {imgBusyId === c.id ? (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-white/75 backdrop-blur-sm">
                        <Spinner size={26} className="text-accent" />
                        <span className="text-xs font-medium text-ink-600">Subiendo…</span>
                      </div>
                    ) : null}

                    {/* Hover controls */}
                    <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        title="Editar"
                        onClick={() => openEdit(c)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-ink-700 shadow-soft transition-colors hover:text-ink-900"
                      >
                        <Pencil size={14} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        title="Eliminar"
                        onClick={() => removeItem(c)}
                        disabled={busyId === c.id}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-status-invalid shadow-soft transition-colors hover:bg-status-invalidBg disabled:opacity-50"
                      >
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
                    </div>

                    <label
                      className={`absolute inset-x-2 bottom-2 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-ink-900/80 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 ${
                        imgBusyId === c.id ? "pointer-events-none opacity-100" : ""
                      }`}
                    >
                      <Upload size={13} strokeWidth={2} />
                      {imgBusyId === c.id ? "Subiendo..." : c.imageUrl ? "Cambiar" : "Subir imagen"}
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
                  </div>

                  {/* Name + status */}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-ink-900">{c.name}</p>
                    {!c.active ? <Badge tone="neutral" dot={false}>Inactivo</Badge> : null}
                  </div>

                  {/* Count */}
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-ink-400">Cantidad</span>
                    <span className="font-semibold tabular-nums text-ink-900">{formatNumber(c.quota)}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] tabular-nums text-ink-400">
                    {formatNumber(c.assignedCount)} asignados · {formatNumber(c.remaining)} restantes
                  </p>

                  {/* Probability */}
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-ink-400">Probabilidad</span>
                    <span className="font-semibold tabular-nums text-ink-900">{pct}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-accent transition-[width] duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Anadir personaje"
        description="La imagen se sube despues de crearlo, desde su tarjeta."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} loading={creating} disabled={!newName.trim()}>
              Crear personaje
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <Input label="Nombre" value={newName} onChange={(e) => setNewName(e.target.value)} disabled={creating} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Cantidad" type="number" min={0} value={newQuota} onChange={(e) => setNewQuota(e.target.value)} disabled={creating} />
            <Input label="Peso" type="number" min={0} step="0.1" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} disabled={creating} />
          </div>
        </div>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `Editar ${editing.name}` : "Editar"}
        footer={
          <div className="flex items-center justify-between gap-3">
            {editing?.imageUrl ? (
              <button
                type="button"
                onClick={() => editing && removeImage(editing)}
                disabled={imgBusyId === editing?.id}
                className="text-xs font-medium text-status-invalid hover:underline disabled:opacity-50"
              >
                Quitar imagen
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)} disabled={busyId === editing?.id}>
                Cancelar
              </Button>
              <Button onClick={saveEdit} loading={busyId === editing?.id}>
                Guardar
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <Input label="Nombre" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Cantidad" type="number" min={0} value={editQuota} onChange={(e) => setEditQuota(e.target.value)} />
            <Input label="Peso" type="number" min={0} step="0.1" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} />
          </div>
          <label className="flex items-center gap-2.5 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={editActive}
              onChange={(e) => setEditActive(e.target.checked)}
              className="h-4 w-4 rounded border-ink-300 accent-accent"
            />
            Activo (participa en las asignaciones)
          </label>
        </div>
      </Dialog>

      {/* Lightbox */}
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
    </div>
  );
}
