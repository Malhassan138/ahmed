import { redirect } from "next/navigation";
import { getCurrentUser, userPermissions } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const safeUser = {
    id: user.id,
    name: user.name,
    role: user.role,
    permissions: userPermissions(user),
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar user={safeUser} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
