// Central list of permission keys used across the app.
// Admin can grant/revoke any of these per user from the Users screen.

export const PERMISSIONS = [
  { key: "products.view", label: "عرض الأصناف" },
  { key: "products.edit", label: "إضافة/تعديل الأصناف" },
  { key: "purchases.view", label: "عرض المشتريات" },
  { key: "purchases.create", label: "تسجيل مشتريات جديدة" },
  { key: "sales.view", label: "عرض المبيعات" },
  { key: "sales.create", label: "نقطة البيع (كاشير)" },
  { key: "sales.edit_price", label: "تعديل السعر عند البيع (تفاوض)" },
  { key: "sales.return", label: "حذف/استرجاع عملية بيع (مرتجع)" },
  { key: "sales.delete", label: "حذف عملية بيع نهائياً من السجل" },
  { key: "inventory.view", label: "عرض المخزون" },
  { key: "inventory.adjust", label: "تعديل جرد المخزون" },
  { key: "users.manage", label: "إدارة المستخدمين والصلاحيات" },
  { key: "audit.view", label: "عرض سجل التعديلات" },
  { key: "reports.view", label: "عرض التقارير" },
  { key: "salaries.manage", label: "إدارة المرتبات" },
  { key: "settings.reset_today", label: "تصفير بيانات اليوم (إعادة تعيين تجريبية)" },
  { key: "settings.reset_all", label: "تصفير كل بيانات النظام (بداية جديدة بعد التجربة)" },
];

export const ROLES = ["ADMIN", "MANAGER", "CASHIER", "WAREHOUSE", "CUSTOM"];
