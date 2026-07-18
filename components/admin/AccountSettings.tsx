"use client";

import { useState, type ReactNode } from "react";
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

function initialsFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const letters = local.replace(/[^a-zA-Z]/g, "");
  return (letters.slice(0, 2) || email.slice(0, 2) || "?").toUpperCase();
}

/** Icon-prefixed input used across the Perfil card, with an optional trailing slot. */
function Field({
  icon,
  label,
  right,
  error,
  className,
  ...props
}: {
  icon: ReactNode;
  label: string;
  right?: ReactNode;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-ink-700">{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">
          {icon}
        </span>
        <input
          className={cn(
            "h-11 w-full rounded-lg border bg-white pl-10 pr-10 text-sm text-ink-900 placeholder:text-ink-300",
            "focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent",
            "disabled:bg-surface-muted disabled:text-ink-400",
            error ? "border-status-invalid" : "border-ink-200",
            className
          )}
          {...props}
        />
        {right ? <span className="absolute right-2 top-1/2 -translate-y-1/2">{right}</span> : null}
      </div>
      {error ? <span className="text-xs text-status-invalid">{error}</span> : null}
    </div>
  );
}

export function AccountSettings({
  currentEmail,
  isSuper = false,
}: {
  currentEmail: string;
  isSuper?: boolean;
}) {
  const toast = useToast();
  const [email, setEmail] = useState(currentEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);

    if (!currentPassword) {
      setPwError("Ingresa tu contraseña actual para confirmar.");
      return;
    }
    if (!newEmail.trim() && !newPassword) {
      toast.info("Nada que cambiar", "Escribe un nuevo correo o una nueva contraseña.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentEmail: email,
          currentPassword,
          newEmail: newEmail.trim(),
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          setPwError(data.error ?? "Contraseña actual incorrecta.");
        } else {
          toast.error("No se pudieron guardar los cambios", data.error);
        }
        return;
      }
      if (data.email) setEmail(data.email);
      setCurrentPassword("");
      setNewEmail("");
      setNewPassword("");
      toast.success("Cambios guardados");
    } catch {
      toast.error("Error de red", "No se pudieron guardar los cambios");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil</CardTitle>
      </CardHeader>
      <CardBody className="p-6">
        <form onSubmit={handleSave} className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* Identity */}
          <div className="flex items-center gap-4 lg:w-60 lg:shrink-0">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-surface-muted text-lg font-semibold tracking-tight text-ink-500">
              {initialsFromEmail(email)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-900">{email}</p>
              {isSuper ? (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-soft px-2.5 py-0.5 text-xs font-medium text-amber">
                  <ShieldCheck size={12} strokeWidth={2.5} />
                  Super admin
                </span>
              ) : null}
            </div>
          </div>

          {/* Divider */}
          <div className="hidden w-px shrink-0 bg-ink-100 lg:block" />

          {/* Editable fields */}
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-4">
              <Field
                icon={<Lock size={16} strokeWidth={2} />}
                label="Contraseña actual"
                type="password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setPwError(null);
                }}
                placeholder="Requerida para confirmar"
                autoComplete="current-password"
                disabled={loading}
                error={pwError ?? undefined}
              />
              <Field
                icon={<Mail size={16} strokeWidth={2} />}
                label="Nuevo correo electrónico"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="tu@ejemplo.com"
                autoComplete="off"
                disabled={loading}
              />
              <Field
                icon={<Lock size={16} strokeWidth={2} />}
                label="Nueva contraseña"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                autoComplete="new-password"
                disabled={loading}
                right={
                  <button
                    type="button"
                    aria-label={showPassword ? "Ocultar" : "Mostrar"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="rounded p-1.5 text-ink-400 hover:text-ink-700"
                  >
                    {showPassword ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                  </button>
                }
              />
            </div>
            <Button type="submit" loading={loading} size="lg" className="sm:self-center">
              Guardar cambios
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
