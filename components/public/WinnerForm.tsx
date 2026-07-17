"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";

interface WinnerFormProps {
  code: string;
}

interface ClaimResult {
  character: { id: string; name: string } | null;
}

export function WinnerForm({ code }: WinnerFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // When set, the claim succeeded — we switch to the success view right here on
  // the client (no server re-render), so the transition is instant and reliable.
  const [claimed, setClaimed] = useState<ClaimResult | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      code,
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      address: String(form.get("address") ?? ""),
    };

    try {
      const res = await fetch("/api/codes/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Error registrando el reclamo");
        return;
      }
      setClaimed({ character: data.character ?? null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error registrando el reclamo");
    } finally {
      setSubmitting(false);
    }
  }

  if (claimed) {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 rounded-lg border border-status-claimed/30 bg-status-claimedBg/50 px-6 py-8 text-center"
      >
        <CheckCircle2 size={40} className="text-status-claimed" strokeWidth={2} />
        <div>
          <p className="text-lg font-semibold text-ink-900">¡Reclamo registrado!</p>
          <p className="mt-1 text-sm text-ink-600">
            Enviaremos tu premio a la direccion que proporcionaste.
          </p>
        </div>
        {claimed.character ? (
          <div className="mt-1 w-full rounded-md border border-ink-100 bg-white px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Tu personaje</p>
            <p className="mt-0.5 text-base font-semibold text-ink-900">{claimed.character.name}</p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Nombre completo"
        name="name"
        required
        minLength={2}
        autoComplete="name"
        placeholder="Nombre y apellidos"
        disabled={submitting}
      />
      <Input
        label="Correo electronico"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="tu@correo.com"
        disabled={submitting}
      />
      <Input
        label="Telefono"
        name="phone"
        type="tel"
        required
        autoComplete="tel"
        placeholder="+52 ..."
        disabled={submitting}
      />
      <Textarea
        label="Direccion de envio"
        name="address"
        required
        minLength={8}
        autoComplete="street-address"
        placeholder="Calle, numero, colonia, ciudad, estado, CP"
        disabled={submitting}
      />
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-status-invalid/30 bg-status-invalidBg px-4 py-3 text-sm font-medium text-status-invalid"
        >
          <AlertCircle size={18} strokeWidth={2} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
      <Button type="submit" loading={submitting} size="lg">
        Reclamar premio
      </Button>
    </form>
  );
}
