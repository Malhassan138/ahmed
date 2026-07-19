"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  Boxes,
  Users,
  FileClock,
  BarChart3,
  LogOut,
  Stethoscope,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "الرئيسية", perm: null, icon: LayoutDashboard },
  { href: "/sales", label: "نقطة البيع (كاشير)", perm: "sales.create", icon: ShoppingCart },
  { href: "/products", label: "الأصناف", perm: "products.view", icon: Package },
  { href: "/purchases", label: "المشتريات", perm: "purchases.view", icon: Truck },
  { href: "/inventory", label: "المخزون", perm: "inventory.view", icon: Boxes },
  { href: "/reports", label: "التقارير", perm: "reports.view", icon: BarChart3 },
  { href: "/users", label: "المستخدمين والصلاحيات", perm: "users.manage", icon: Users },
  { href: "/audit", label: "سجل التعديلات", perm: "audit.view", icon: FileClock },
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
      <div className="p-4 border-b border-white/10 flex items-center gap-2">
        <div className="bg-white/10 rounded-lg p-2">
          <Stethoscope size={22} />
        </div>
        <div>
          <div className="font-bold text-lg leading-tight">نظام إدارة المحل</div>
          <div className="text-xs text-white/70">
            {user.name} — {roleLabel(user.role)}
          </div>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {NAV.filter((item) => can(item.perm)).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150 ${
                active
                  ? "bg-white text-brand-700 font-semibold shadow-sm"
                  : "text-white/90 hover:bg-white/10 hover:translate-x-[-2px]"
              }`}
            >
              <Icon size={18} className={active ? "text-brand-700" : "text-white/80"} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-2 border-t border-white/10">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 text-sm text-white/90 hover:bg-white/10 rounded-lg px-3 py-2 text-right transition-colors"
        >
          <LogOut size={18} />
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
