"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { MoreVertical, Plus, Pencil, Power, Trash2, UserPlus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { SpinnerBlock } from "@/components/ui/Spinner";

interface UserRow {
  id: string;
  email: string;
  disabled: boolean;
  createdAt: string | null;
}

/** Small kebab menu with click-away handling. */
function RowMenu({ children }: { children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        aria-label="Acciones"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-surface-muted hover:text-ink-700"
      >
        <MoreVertical size={16} strokeWidth={2} />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-ink-200 bg-white py-1 shadow-elevated">
            {children(() => setOpen(false))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon,
  onClick,
  danger,
  children,
}: {
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
        danger
          ? "text-status-invalid hover:bg-status-invalidBg"
          : "text-ink-700 hover:bg-surface-muted"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

export function UsersManager({ currentEmail }: { currentEmail: string }) {
  const me = currentEmail.trim().toLowerCase();
  const toast = useToast();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit dialog
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo cargar la lista");
        return;
      }
      setUsers(data.users ?? []);
    } catch {
      setError("Error de red");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, password: newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("No se pudo crear el usuario", data.error);
        return;
      }
      setNewEmail("");
      setNewPassword("");
      setShowCreate(false);
      await load();
      toast.success("Usuario creado");
    } catch {
      toast.error("Error de red", "No se pudo crear el usuario");
    } finally {
      setCreating(false);
    }
  }

  async function patch(id: string, payload: Record<string, unknown>, successMsg?: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("No se pudo actualizar", data.error);
        return false;
      }
      await load();
      if (successMsg) toast.success(successMsg);
      return true;
    } catch {
      toast.error("Error de red", "No se pudo actualizar");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(u: UserRow) {
    if (
      !window.confirm(`¿Eliminar la cuenta ${u.email}? Esta acción es permanente y no se puede deshacer.`)
    ) {
      return;
    }
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("No se pudo eliminar", data.error);
        return;
      }
      await load();
      toast.success("Usuario eliminado");
    } catch {
      toast.error("Error de red", "No se pudo eliminar");
    } finally {
      setBusyId(null);
    }
  }

  function openEdit(u: UserRow) {
    setEditing(u);
    setEditEmail(u.email);
    setEditPassword("");
  }

  async function handleSaveEdit() {
    if (!editing) return;
    const payload: Record<string, unknown> = {};
    if (editEmail.trim()) payload.email = editEmail.trim();
    if (editPassword) payload.password = editPassword;
    if (Object.keys(payload).length === 0) {
      setEditing(null);
      return;
    }
    const ok = await patch(editing.id, payload, "Cambios guardados");
    if (ok) setEditing(null);
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-3">
        <CardTitle>Miembros del equipo</CardTitle>
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <Plus size={16} strokeWidth={2.5} />
          Añadir usuario
        </Button>
      </CardHeader>
      <CardBody className="p-0">
        {error ? <p className="px-6 pt-4 text-sm text-status-invalid">{error}</p> : null}

        {loadingList ? (
          <SpinnerBlock label="Cargando usuarios…" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-400">
                  <th className="px-6 py-3 font-medium">Correo electrónico</th>
                  <th className="px-6 py-3 font-medium">Estado</th>
                  <th className="px-6 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isMe = u.email.toLowerCase() === me;
                  return (
                    <tr key={u.id} className="border-b border-ink-50 last:border-0 hover:bg-surface-muted/40">
                      <td className="px-6 py-3.5">
                        <span className="break-all font-medium text-ink-900">{u.email}</span>
                        {isMe ? (
                          <span className="ml-2 rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink-500">
                            Tú
                          </span>
                        ) : null}
                      </td>
                      <td className="px-6 py-3.5">
                        {u.disabled ? (
                          <Badge tone="neutral">Inactivo</Badge>
                        ) : (
                          <Badge tone="success">Activo</Badge>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {isMe ? (
                          <span className="text-xs text-ink-400">Editar en “Perfil”</span>
                        ) : (
                          <RowMenu>
                            {(close) => (
                              <>
                                <MenuItem
                                  icon={<Pencil size={15} strokeWidth={2} />}
                                  onClick={() => {
                                    close();
                                    openEdit(u);
                                  }}
                                >
                                  Editar
                                </MenuItem>
                                <MenuItem
                                  icon={<Power size={15} strokeWidth={2} />}
                                  onClick={() => {
                                    close();
                                    void patch(
                                      u.id,
                                      { disabled: !u.disabled },
                                      u.disabled ? "Usuario habilitado" : "Usuario deshabilitado"
                                    );
                                  }}
                                >
                                  {u.disabled ? "Habilitar" : "Deshabilitar"}
                                </MenuItem>
                                <MenuItem
                                  icon={<Trash2 size={15} strokeWidth={2} />}
                                  danger
                                  onClick={() => {
                                    close();
                                    void deleteUser(u);
                                  }}
                                >
                                  Eliminar
                                </MenuItem>
                              </>
                            )}
                          </RowMenu>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-sm text-ink-400">
                      No hay usuarios todavía.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>

      {/* Create dialog */}
      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Añadir usuario"
        description="Crea una cuenta de administrador con correo y contraseña."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              loading={creating}
              disabled={!newEmail.trim() || newPassword.length < 4}
              className="gap-2"
            >
              <UserPlus size={16} strokeWidth={2.25} />
              Crear usuario
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            label="Correo"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="nuevo@correo.com"
            disabled={creating}
          />
          <Input
            label="Contraseña"
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            hint="Mínimo 4 caracteres"
            disabled={creating}
          />
        </div>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `Editar ${editing.email}` : "Editar"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={busyId === editing?.id}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} loading={busyId === editing?.id}>
              Guardar
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <Input label="Correo" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
          <Input
            label="Nueva contraseña"
            type="text"
            value={editPassword}
            onChange={(e) => setEditPassword(e.target.value)}
            placeholder="Déjala vacía para no cambiarla"
          />
        </div>
      </Dialog>
    </Card>
  );
}
