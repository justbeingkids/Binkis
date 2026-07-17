import { Topbar } from "@/components/admin/Topbar";
import { GenerateForm } from "@/components/admin/GenerateForm";
import { getAllCodes } from "@/lib/supabase/codes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GeneratePage() {
  const codes = await getAllCodes();

  return (
    <div className="flex h-full flex-col">
      <Topbar title="Generar codigos" breadcrumb="Codigos" />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-6 sm:px-6 lg:px-8">
        <GenerateForm currentTotal={codes.length} maxPerBatch={10000} />
      </div>
    </div>
  );
}
