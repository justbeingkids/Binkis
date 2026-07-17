import { Sidebar } from "@/components/admin/Sidebar";
import { MobileNav } from "@/components/admin/MobileNav";
import { getAdminSession } from "@/lib/admin-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  const userEmail = session?.sub ?? null;

  return (
    <div className="flex h-screen overflow-hidden bg-surface-base">
      <Sidebar userEmail={userEmail} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
