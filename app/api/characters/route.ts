import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthed } from "@/lib/admin-auth";
import { listCharacters, createCharacter } from "@/lib/supabase/characters";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const characters = await listCharacters();
  return NextResponse.json({ characters });
}

const createSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(100),
  quota: z.number().int().min(0, "Cantidad invalida"),
  weight: z.number().min(0).optional(),
  variantId: z.string().optional(),
});

export async function POST(request: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos invalidos" }, { status: 400 });
  }

  const character = await createCharacter({
    name: parsed.data.name,
    quota: parsed.data.quota,
    weight: parsed.data.weight,
    variantId: parsed.data.variantId ?? null,
  });
  return NextResponse.json({ ok: true, character });
}
