import { Topbar } from "@/components/admin/Topbar";
import { CharactersManager } from "@/components/admin/CharactersManager";
import { listCharacters } from "@/lib/supabase/characters";

export const dynamic = "force-dynamic";

export default async function CharactersPage() {
  // Load server-side (the page is already gated by middleware) so the list is
  // present on first paint — no fragile client fetch that can flash "No autorizado".
  const initialCharacters = await listCharacters();

  return (
    <>
      <Topbar
        title="Personajes"
        description="Inventario y probabilidad de asignación de las ediciones limitadas."
      />
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <CharactersManager initialCharacters={initialCharacters} />
      </div>
    </>
  );
}
