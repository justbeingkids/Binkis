import Link from "next/link";
import { Code2 } from "lucide-react";
import { Topbar } from "@/components/admin/Topbar";
import { CodesExplorer } from "@/components/admin/CodesExplorer";
import { Button } from "@/components/ui/Button";
import { getAllCodes } from "@/lib/supabase/codes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CodesPage() {
  const codes = await getAllCodes();
  const recent = [...codes].sort((a, b) => (b.generatedAt > a.generatedAt ? 1 : -1));
  const characterNames = [...new Set(codes.map((c) => c.characterName).filter(Boolean) as string[])].sort();

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Codigos"
        action={
          <Link href="/generate">
            <Button className="gap-2">
              <Code2 size={16} strokeWidth={2.25} />
              Generar codigos
            </Button>
          </Link>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 sm:px-6 lg:px-8">
        <CodesExplorer codes={recent} characterNames={characterNames} />
      </div>
    </div>
  );
}
