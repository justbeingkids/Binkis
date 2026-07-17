"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";

interface WinnerFormProps {
  code: string;
}

export function WinnerForm({ code }: WinnerFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error registrando el reclamo");
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error registrando el reclamo");
    } finally {
      setSubmitting(false);
    }
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
