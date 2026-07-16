import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { findCharacterById } from "@/lib/supabase/characters";
import {
  removeCharacterImage,
  setCharacterImageUrl,
  publicImageUrl,
} from "@/lib/supabase/character-images";

export const dynamic = "force-dynamic";

// Finalize: called AFTER the browser has uploaded the file to Storage via the
// signed URL. Records the (cache-busted) public URL on the character row.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const character = await findCharacterById(id);
  if (!character) return NextResponse.json({ error: "Personaje no encontrado" }, { status: 404 });

  try {
    const url = publicImageUrl(id, Date.now());
    await setCharacterImageUrl(id, url);
    return NextResponse.json({ ok: true, imageUrl: url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo guardar la imagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const character = await findCharacterById(id);
  if (!character) return NextResponse.json({ error: "Personaje no encontrado" }, { status: 404 });

  try {
    await removeCharacterImage(id);
    await setCharacterImageUrl(id, null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al eliminar la imagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
