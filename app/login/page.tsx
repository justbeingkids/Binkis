"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/** Only allow internal absolute paths; blocks open-redirects (//evil, http://evil). */
function safeInternalPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-base" />}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const params = useSearchParams();
  const from = safeInternalPath(params.get("from"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Count the cooldown down to 0, one second at a time.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cooldown > 0 || loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Correo o password incorrecto");
        if (typeof data.retryAfter === "number" && data.retryAfter > 0) {
          setCooldown(data.retryAfter);
        }
        return;
      }
      // Full browser navigation (not the client router) so the fresh session
      // cookie is sent and the original page loads reliably. A client-side
      // transition here was leaving the user stuck on /login until they
      // manually changed the URL.
      window.location.replace(from);
      return;
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
          <Button type="submit" loading={loading} disabled={cooldown > 0} size="lg">
            {cooldown > 0 ? `Espera ${cooldown}s` : "Ingresar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
