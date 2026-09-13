import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission, verifyPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// Full factory reset: wipes ALL sales, purchases, stock movements and audit history,
// and zeroes every product's stock count. Products, categories, suppliers, users and
// permissions are kept, so the store doesn't have to rebuild its catalog/staff list.
// Meant for switching from a trial period to real day-to-day use.
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "settings.reset_all")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { password } = await req.json();
  if (!password) {
    return NextResponse.json({ error: "أدخل كلمة المرور للتأكيد" }, { status: 400 });
  }
  const ok = await verifyPassword(password, user.password);
  if (!ok) {
    return NextResponse.json({ error: "كلمة المرور غير صحيحة" }, { status: 401 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const movements = await tx.stockMovement.deleteMany({});
    const sales = await tx.sale.deleteMany({}); // cascades SaleItem
    const purchases = await tx.purchase.deleteMany({}); // cascades PurchaseItem
    const salaries = await tx.salaryPayment.deleteMany({});
    await tx.auditLog.deleteMany({});
    const products = await tx.product.updateMany({ data: { quantity: 0 } });

    return {
      movements: movements.count,
      sales: sales.count,
      purchases: purchases.count,
      salaries: salaries.count,
      productsReset: products.count,
    };
  });

  // Logged fresh, since the audit log was just wiped above.
  await logAudit({
    userId: user.id,
    action: "DELETE",
    entity: "Inventory",
    entityId: null,
    details: { note: "تصفير كامل للنظام - بداية جديدة", ...result },
  });

  return NextResponse.json({ ok: true, ...result });
}
