import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { findCharacterById } from "@/lib/supabase/characters";
import { createImageUploadTicket } from "@/lib/supabase/character-images";

export const dynamic = "force-dynamic";

// Issues a signed upload ticket so the browser can upload the image directly to
// Supabase Storage. Admin-only; the file bytes never pass through this function.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const character = await findCharacterById(id);
  if (!character) return NextResponse.json({ error: "Personaje no encontrado" }, { status: 404 });

  try {
    const ticket = await createImageUploadTicket(id);
    return NextResponse.json({ ok: true, ...ticket });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo preparar la subida";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
