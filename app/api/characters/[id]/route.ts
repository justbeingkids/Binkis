import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthed } from "@/lib/admin-auth";
import { updateCharacter, deleteCharacter } from "@/lib/supabase/characters";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  quota: z.number().int().min(0).optional(),
  weight: z.number().min(0).optional(),
  active: z.boolean().optional(),
  variantId: z.string().nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos invalidos" }, { status: 400 });
  }

  try {
    const result = await updateCharacter(id, parsed.data);
    if (!result.ok) {
      const msg =
        result.reason === "not_found"
          ? "Personaje no encontrado"
          : result.reason === "quota_below_assigned"
          ? "La cantidad no puede ser menor a las ya asignadas"
          : "No se pudo actualizar";
      return NextResponse.json({ error: msg }, { status: result.reason === "not_found" ? 404 : 400 });
    }
    return NextResponse.json({ ok: true, warning: result.warning });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo actualizar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  try {
    const result = await deleteCharacter(id);
    if (!result.ok) {
      const msg =
        result.reason === "not_found"
          ? "Personaje no encontrado"
          : result.reason === "has_assignments"
          ? "No se puede eliminar: ya tiene personajes asignados"
          : "No se pudo eliminar";
      return NextResponse.json({ error: msg }, { status: result.reason === "not_found" ? 404 : 400 });
    }
    return NextResponse.json({ ok: true, warning: result.warning });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo eliminar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
