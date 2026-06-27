"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-base" />}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Correo o password incorrecto");
        return;
      }
      router.replace(from);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base px-4">
      <div className="w-full max-w-sm rounded-xl border border-ink-200 bg-white p-7 shadow-soft">
        <div className="flex items-center gap-3 border-b border-ink-100 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-white">
            <Lock size={16} strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-ink-900">Acceso administrativo</h1>
            <p className="text-xs text-ink-500">BinKis - Sistema de Validacion</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <Input
            label="Correo"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            disabled={loading}
            placeholder="tu@correo.com"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error ?? undefined}
            required
            autoComplete="current-password"
            disabled={loading}
          />
          <Button type="submit" loading={loading} size="lg">
            Ingresar
          </Button>
        </form>
      </div>
    </div>
  );
}
