"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Shuffle, Search, Database } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/format";

type CheckState =
  | "winner_available"
  | "claimed"
  | "exists_not_winner"
  | "not_found"
  | "invalid_format";

interface CheckResult {
  state: CheckState;
  code: string;
  claimedAt?: string | null;
  generatedAt?: string | null;
  source: "manual" | "random";
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateRandomCandidate(): string {
  function seg(n: number) {
    let s = "";
    for (let i = 0; i < n; i += 1) {
      s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return s;
  }
  return `BNK-${seg(4)}-${seg(4)}`;
}

export function CodeChecker() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);

  async function check(source: "manual" | "random", explicitCode?: string) {
    const target = (explicitCode ?? code).trim().toUpperCase();
    if (!target) {
      setError("Ingresa un codigo o genera uno aleatorio");
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/codes/lookup?code=${encodeURIComponent(target)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error verificando");
      }
      const data = await res.json();
      setResult({
        state: data.state as CheckState,
        code: target,
        claimedAt: data.claimedAt ?? null,
        generatedAt: data.generatedAt ?? null,
        source,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error verificando");
    } finally {
      setLoading(false);
    }
  }

  function handleRandom() {
    const random = generateRandomCandidate();
    setCode(random);
    check("random", random);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Verificar codigo</CardTitle>
          <CardDescription>
            Ingresa un codigo para ver su estado real en la base de datos: si existe, si es ganador,
            si ya fue reclamado o si no existe.
          </CardDescription>
        </CardHeader>
        <CardBody>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void check("manual");
            }}
            className="flex flex-col gap-4"
          >
            <Input
              label="Codigo"
              name="code"
              placeholder="BNK-XXXX-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              error={error ?? undefined}
              hint="Formato: BNK seguido de 2 grupos de 4 caracteres"
              disabled={loading}
              autoComplete="off"
              spellCheck={false}
              className="font-mono uppercase tracking-wider"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" loading={loading} className="flex-1">
                <Search size={14} strokeWidth={2.5} />
                Verificar
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleRandom}
                disabled={loading}
                className="flex-1"
              >
                <Shuffle size={14} strokeWidth={2.5} />
                Generar y verificar
              </Button>
            </div>
            <p className="text-xs text-ink-400">
              &quot;Generar y verificar&quot; crea un codigo al azar dentro del mismo formato y lo busca en
              la base de datos. Sirve para demostrar que solo los codigos cargados realmente existen.
            </p>
          </form>
        </CardBody>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Resultado</CardTitle>
          <CardDescription>
            {result
              ? result.source === "random"
                ? "Codigo aleatorio verificado contra Supabase"
                : "Codigo ingresado manualmente verificado contra Supabase"
              : "Aun no se ha verificado ningun codigo en esta sesion."}
          </CardDescription>
        </CardHeader>
        <CardBody>
          {!result ? (
            <p className="text-sm text-ink-400">
              El resultado aparecera aqui despues de la verificacion.
            </p>
          ) : null}
          {result ? <ResultPanel result={result} /> : null}
        </CardBody>
      </Card>
    </div>
  );
}

function ResultPanel({ result }: { result: CheckResult }) {
  const sourceLabel = result.source === "random" ? "Aleatorio" : "Manual";

  if (result.state === "winner_available") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-md border border-status-claimed/20 bg-status-claimedBg/40 px-4 py-3">
          <CheckCircle2 size={22} className="text-status-claimed" strokeWidth={2} />
          <div>
            <p className="text-sm font-semibold text-status-claimed">Codigo GANADOR</p>
            <p className="text-xs text-ink-700">
              Existe en el sistema, es ganador y todavia no ha sido reclamado.
            </p>
          </div>
        </div>
        <CodeDetail code={result.code} sourceLabel={sourceLabel} generatedAt={result.generatedAt} />
      </div>
    );
  }

  if (result.state === "claimed") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-md border border-ink-200 bg-surface-muted px-4 py-3">
          <AlertTriangle size={22} className="text-ink-500" strokeWidth={2} />
          <div>
            <p className="text-sm font-semibold text-ink-900">Codigo ya reclamado</p>
            <p className="text-xs text-ink-700">
              Es ganador pero el premio fue asignado el {formatDateTime(result.claimedAt)}.
            </p>
          </div>
        </div>
        <CodeDetail code={result.code} sourceLabel={sourceLabel} generatedAt={result.generatedAt} />
      </div>
    );
  }

  if (result.state === "exists_not_winner") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-md border border-accent/20 bg-accent/5 px-4 py-3">
          <Database size={22} className="text-accent" strokeWidth={2} />
          <div>
            <p className="text-sm font-semibold text-accent">Existe en la base — Disponible</p>
            <p className="text-xs text-ink-700">
              El codigo si esta cargado en Supabase, pero todavia no es ganador. Corre el sorteo
              (Loteria) para marcar los codigos ganadores.
            </p>
          </div>
        </div>
        <CodeDetail code={result.code} sourceLabel={sourceLabel} generatedAt={result.generatedAt} />
      </div>
    );
  }

  // not_found or invalid_format
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-md border border-status-invalid/20 bg-status-invalidBg/60 px-4 py-3">
        <XCircle size={22} className="text-status-invalid" strokeWidth={2} />
        <div>
          <p className="text-sm font-semibold text-status-invalid">
            {result.state === "invalid_format" ? "Formato invalido" : "No existe en el sistema"}
          </p>
          <p className="text-xs text-ink-700">
            {result.state === "invalid_format"
              ? "El codigo no respeta el formato BNK-XXXX-XXXX."
              : result.source === "random"
              ? "El codigo aleatorio no coincide con ninguno cargado. Justamente esto demuestra que solo los codigos en la base de datos existen."
              : "Este codigo no esta en la base de datos."}
          </p>
        </div>
      </div>
      <CodeDetail code={result.code} sourceLabel={sourceLabel} />
    </div>
  );
}

function CodeDetail({
  code,
  sourceLabel,
  generatedAt,
}: {
  code: string;
  sourceLabel: string;
  generatedAt?: string | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-md border border-ink-100 bg-surface-muted px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Codigo verificado</p>
        <p className="mt-1 font-mono text-sm font-semibold tracking-wider text-ink-900">{code}</p>
      </div>
      <div className="rounded-md border border-ink-100 bg-surface-muted px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
          {generatedAt ? "Generado" : "Origen"}
        </p>
        <p className="mt-1 text-sm text-ink-900">
          {generatedAt ? (
            <span className="tabular-nums">{formatDateTime(generatedAt)}</span>
          ) : (
            <Badge tone={sourceLabel === "Aleatorio" ? "info" : "neutral"}>{sourceLabel}</Badge>
          )}
        </p>
      </div>
    </div>
  );
}
