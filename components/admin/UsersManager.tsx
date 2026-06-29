"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { formatDateTime } from "@/lib/format";

interface UserRow {
  id: string;
  email: string;
  disabled: boolean;
  createdAt: string | null;
}

export function UsersManager() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateMsg(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, password: newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateMsg(data.error ?? "No se pudo crear");
        return;
      }
      setNewEmail("");
      setNewPassword("");
      setCreateMsg("Usuario creado.");
      await load();
    } catch {
      setCreateMsg("Error de red");
    } finally {
      setCreating(false);
    }
  }

  async function patch(id: string, payload: Record<string, unknown>) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
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

  async function handleSaveEdit(id: string) {
    const payload: Record<string, unknown> = {};
    if (editEmail.trim()) payload.email = editEmail.trim();
    if (editPassword) payload.password = editPassword;
    if (Object.keys(payload).length === 0) {
      setEditingId(null);
      return;
    }
    const ok = await patch(id, payload);
    if (ok) setEditingId(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuarios admin</CardTitle>
        <CardDescription>
          Crea cuentas, cambia su correo o contraseña, y deshabilítalas o vuélvelas a habilitar.
        </CardDescription>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleCreate} className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Correo"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              placeholder="nuevo@correo.com"
              disabled={creating}
            />
          </div>
          <div className="flex-1">
            <Input
              label="Password"
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              hint="Mínimo 4 caracteres"
              disabled={creating}
            />
          </div>
          <Button type="submit" loading={creating}>Crear</Button>
        </form>
        {createMsg ? <p className="mb-4 text-sm text-ink-600">{createMsg}</p> : null}
        {error ? <p className="mb-4 text-sm text-status-invalid">{error}</p> : null}

        {loadingList ? (
          <p className="text-sm text-ink-400">Cargando…</p>
        ) : (
          <Table>
            <THead>
              <TH>Correo</TH>
              <TH>Estado</TH>
              <TH>Creado</TH>
              <TH className="text-right">Acciones</TH>
            </THead>
            <TBody>
              {users.map((u, idx) => (
                <TR key={u.id} striped={idx % 2 === 1}>
                  <TD className="font-medium text-ink-900">
                    {editingId === u.id ? (
                      <div className="flex flex-col gap-2">
                        <Input
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="correo"
                        />
                        <Input
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="nuevo password (opcional)"
                        />
                      </div>
                    ) : (
                      u.email
                    )}
                  </TD>
                  <TD>
                    {u.disabled ? (
                      <Badge tone="danger">Deshabilitado</Badge>
                    ) : (
                      <Badge tone="success">Activo</Badge>
                    )}
                  </TD>
                  <TD className="text-ink-500 tabular-nums">{formatDateTime(u.createdAt)}</TD>
                  <TD className="text-right">
                    {editingId === u.id ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" loading={busyId === u.id} onClick={() => handleSaveEdit(u.id)}>
                          Guardar
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingId(u.id);
                            setEditEmail(u.email);
                            setEditPassword("");
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant={u.disabled ? "secondary" : "danger"}
                          loading={busyId === u.id}
                          onClick={() => patch(u.id, { disabled: !u.disabled })}
                        >
                          {u.disabled ? "Habilitar" : "Deshabilitar"}
                        </Button>
                      </div>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardBody>
    </Card>
  );
}
