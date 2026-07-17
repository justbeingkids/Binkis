import { Topbar } from "@/components/admin/Topbar";
import { CharactersManager } from "@/components/admin/CharactersManager";
import { listCharacters } from "@/lib/supabase/characters";

export const dynamic = "force-dynamic";

export default async function CharactersPage() {
  // Load server-side (the page is already gated by middleware) so the list is
  // present on first paint — no fragile client fetch that can flash "No autorizado".
  const initialCharacters = await listCharacters();

  return (
    <div className="flex h-full flex-col">
      <Topbar title="Personajes" />
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 sm:px-6 lg:px-8">
        <CharactersManager initialCharacters={initialCharacters} />
      </div>
    </div>
  );
}
