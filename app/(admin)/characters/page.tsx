import { Topbar } from "@/components/admin/Topbar";
import { CharactersManager } from "@/components/admin/CharactersManager";

export const dynamic = "force-dynamic";

export default function CharactersPage() {
  return (
    <>
      <Topbar
        title="Personajes"
        description="Inventario y probabilidad de asignación de las ediciones limitadas."
      />
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <CharactersManager />
      </div>
    </>
  );
}
