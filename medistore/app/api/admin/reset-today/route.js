import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission, verifyPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// Reverses every stock movement recorded today and deletes today's sales/purchases,
// so a store can wipe a trial day's test data and start clean.
// Requires the user's own password as an extra confirmation step.
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "settings.reset_today")) {
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

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const INCREASING_TYPES = ["PURCHASE", "ADJUST_IN", "RETURN"];

  const result = await prisma.$transaction(async (tx) => {
    const movements = await tx.stockMovement.findMany({
      where: { createdAt: { gte: startOfDay } },
    });

    // Undo each movement's effect on stock before deleting it.
    for (const mv of movements) {
      const reverse = INCREASING_TYPES.includes(mv.type)
        ? { decrement: mv.quantity }
        : { increment: mv.quantity };
      await tx.product.update({ where: { id: mv.productId }, data: { quantity: reverse } });
    }
    await tx.stockMovement.deleteMany({ where: { createdAt: { gte: startOfDay } } });

    const salesDeleted = await tx.sale.deleteMany({ where: { createdAt: { gte: startOfDay } } });
    const purchasesDeleted = await tx.purchase.deleteMany({ where: { createdAt: { gte: startOfDay } } });

    return {
      movements: movements.length,
      sales: salesDeleted.count,
      purchases: purchasesDeleted.count,
    };
  });

  await logAudit({
    userId: user.id,
    action: "DELETE",
    entity: "Inventory",
    entityId: null,
    details: { note: "تصفير بيانات اليوم (تجريبي)", ...result },
  });

  return NextResponse.json({ ok: true, ...result });
}
