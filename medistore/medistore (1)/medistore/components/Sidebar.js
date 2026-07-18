"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "الرئيسية", perm: null },
  { href: "/sales", label: "نقطة البيع (كاشير)", perm: "sales.create" },
  { href: "/products", label: "الأصناف", perm: "products.view" },
  { href: "/purchases", label: "المشتريات", perm: "purchases.view" },
  { href: "/inventory", label: "المخزون", perm: "inventory.view" },
  { href: "/reports", label: "التقارير", perm: "reports.view" },
  { href: "/users", label: "المستخدمين والصلاحيات", perm: "users.manage" },
  { href: "/audit", label: "سجل التعديلات", perm: "audit.view" },
];

export default function Sidebar({ user }) {
  const pathname = usePathname();
  const router = useRouter();
  const perms = user.role === "ADMIN" ? ["*"] : user.permissions;
  const can = (p) => !p || perms.includes("*") || perms.includes(p);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-64 bg-brand-700 text-white min-h-screen flex flex-col shrink-0">
      <div className="p-4 border-b border-white/10">
        <div className="font-bold text-lg">نظام إدارة المحل</div>
        <div className="text-xs text-white/70 mt-1">
          {user.name} — {roleLabel(user.role)}
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {NAV.filter((item) => can(item.perm)).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-lg px-3 py-2 text-sm transition ${
              pathname === item.href
                ? "bg-white text-brand-700 font-semibold"
                : "text-white/90 hover:bg-white/10"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-2 border-t border-white/10">
        <button onClick={logout} className="w-full text-sm text-white/90 hover:bg-white/10 rounded-lg px-3 py-2 text-right">
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}

function roleLabel(role) {
  const map = {
    ADMIN: "مدير",
    MANAGER: "مشرف",
    CASHIER: "كاشير",
    WAREHOUSE: "مخازن",
    CUSTOM: "صلاحيات مخصصة",
  };
  return map[role] || role;
}
