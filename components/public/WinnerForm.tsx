"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MX_STATES } from "@/lib/mx-states";

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
      street: String(form.get("street") ?? ""),
      extNumber: String(form.get("extNumber") ?? ""),
      intNumber: String(form.get("intNumber") ?? ""),
      colonia: String(form.get("colonia") ?? ""),
      postalCode: String(form.get("postalCode") ?? ""),
      city: String(form.get("city") ?? ""),
      state: String(form.get("state") ?? ""),
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
      <fieldset className="flex flex-col gap-4" disabled={submitting}>
        <legend className="mb-1 text-sm font-semibold text-ink-900">Direccion de envio</legend>
        <Input
          label="Calle"
          name="street"
          required
          minLength={2}
          autoComplete="address-line1"
          placeholder="Ej. Colibri"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Numero exterior"
            name="extNumber"
            required
            inputMode="numeric"
            autoComplete="off"
            placeholder="48"
          />
          <Input
            label="Numero interior"
            name="intNumber"
            autoComplete="address-line2"
            placeholder="Opcional"
          />
        </div>
        <Input
          label="Colonia"
          name="colonia"
          required
          minLength={2}
          autoComplete="address-level3"
          placeholder="Ej. Los Lagos"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Codigo postal"
            name="postalCode"
            required
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            autoComplete="postal-code"
            placeholder="83245"
            title="5 digitos"
          />
          <Input
            label="Ciudad"
            name="city"
            required
            minLength={2}
            autoComplete="address-level2"
            placeholder="Hermosillo"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="state" className="text-sm font-medium text-ink-700">
            Estado
          </label>
          <select
            id="state"
            name="state"
            required
            defaultValue=""
            autoComplete="address-level1"
            className="h-10 rounded-md border border-ink-200 bg-white px-3 text-sm text-ink-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 disabled:bg-surface-muted disabled:text-ink-400"
          >
            <option value="" disabled>
              Selecciona tu estado
            </option>
            {MX_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </fieldset>
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
