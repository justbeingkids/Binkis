"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export function AccountSettings({ currentEmail }: { currentEmail: string }) {
  const toast = useToast();
  const [step, setStep] = useState<"verify" | "edit">("verify");
  const [curEmail, setCurEmail] = useState(currentEmail);
  const [curPassword, setCurPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(payload: Record<string, string>) {
    const res = await fetch("/api/admin/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data } as const;
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { ok, data } = await post({ currentEmail: curEmail, currentPassword: curPassword });
      if (!ok) {
        setError(data.error ?? "No se pudo verificar");
        return;
      }
      setNewEmail(data.email ?? curEmail);
      setNewPassword("");
      setConfirmPassword("");
      setStep("edit");
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword && newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    try {
      const { ok, data } = await post({
        currentEmail: curEmail,
        currentPassword: curPassword,
        newEmail,
        newPassword,
      });
      if (!ok) {
        setError(data.error ?? "No se pudo guardar");
        return;
      }
      if (data.email) setCurEmail(data.email);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Cambios guardados");
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mi cuenta</CardTitle>
        <CardDescription>
          {step === "verify"
            ? "Confirma tu correo y contraseña actuales para poder editarlos."
            : `Editando ${curEmail}. Deja un campo vacío para no cambiarlo.`}
        </CardDescription>
      </CardHeader>
      <CardBody>
        {step === "verify" ? (
          <form onSubmit={handleVerify} className="flex max-w-sm flex-col gap-4">
            <Input
              label="Correo actual"
              type="email"
              value={curEmail}
              onChange={(e) => setCurEmail(e.target.value)}
              required
              autoComplete="username"
              disabled={loading}
            />
            <Input
              label="Password actual"
              type="password"
              value={curPassword}
              onChange={(e) => setCurPassword(e.target.value)}
              error={error ?? undefined}
              required
              autoComplete="current-password"
              disabled={loading}
            />
            <Button type="submit" loading={loading}>Continuar</Button>
          </form>
        ) : (
          <form onSubmit={handleSave} className="flex max-w-sm flex-col gap-4">
            <Input
              label="Nuevo correo"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={loading}
              autoComplete="off"
            />
            <Input
              label="Nuevo password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              hint="Déjalo vacío para mantener el actual"
              disabled={loading}
              autoComplete="new-password"
            />
            <Input
              label="Confirmar nuevo password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={error ?? undefined}
              disabled={loading}
              autoComplete="new-password"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" loading={loading} className="w-full sm:w-auto">
                Guardar cambios
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                className="w-full sm:w-auto"
                onClick={() => {
                  setStep("verify");
                  setCurPassword("");
                  setConfirmPassword("");
                  setError(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
