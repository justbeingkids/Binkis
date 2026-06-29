import { Topbar } from "@/components/admin/Topbar";
import { AccountSettings } from "@/components/admin/AccountSettings";
import { UsersManager } from "@/components/admin/UsersManager";
import { AuditLog } from "@/components/admin/AuditLog";
import { getAdminSession } from "@/lib/admin-auth";
import { isSuperAdmin } from "@/lib/admin-roles";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getAdminSession();
  const email = session?.sub ?? "";
  const isSuper = isSuperAdmin(email);

  return (
    <>
      <Topbar
        title="Mi cuenta"
        description="Cambia tu correo y contraseña. Para hacerlo, confirma tus datos actuales."
        meta={isSuper ? <span className="text-xs font-medium text-amber">Super admin</span> : undefined}
      />
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <AccountSettings currentEmail={email} />
        {isSuper ? (
          <>
            <UsersManager />
            <AuditLog />
          </>
        ) : null}
      </div>
    </>
  );
}
