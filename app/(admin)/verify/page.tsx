import { Topbar } from "@/components/admin/Topbar";
import { CodeChecker } from "@/components/admin/CodeChecker";

export const dynamic = "force-dynamic";

export default function VerifyPage() {
  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Verificar codigo"
        description="Confirma si un codigo cualquiera es ganador, ya fue reclamado o no existe."
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-6 sm:px-6 lg:px-8">
        <CodeChecker />
      </div>
    </div>
  );
}
