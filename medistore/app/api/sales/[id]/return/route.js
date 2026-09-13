import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// Returns whatever quantity is still remaining across every item in the sale
// (accounts for items that were already partially returned), and marks the
// whole sale as returned. Excluded from revenue totals from then on.
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "sales.return")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const id = Number(params.id);
  const sale = await prisma.sale.findUnique({ where: { id }, include: { items: true } });
  if (!sale) return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 });
  if (sale.returned) return NextResponse.json({ error: "الفاتورة دي اترجعت بالفعل" }, { status: 400 });

  let reason = null;
  try {
    const body = await req.json();
    reason = body?.reason || null;
  } catch {
    // no body provided, that's fine
  }

  let refundAmount = 0;

  await prisma.$transaction(async (tx) => {
    for (const item of sale.items) {
      const remaining = item.quantity - item.returnedQty;
      if (remaining <= 0) continue;
      refundAmount += remaining * item.sellPrice;

      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { increment: remaining } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          userId: user.id,
          type: "RETURN",
          quantity: remaining,
          reason: `مرتجع من فاتورة #${sale.id}${reason ? " - " + reason : ""}`,
        },
      });
      await tx.saleItem.update({
        where: { id: item.id },
        data: { returnedQty: item.quantity },
      });
    }
    await tx.sale.update({
      where: { id },
      data: { total: { decrement: refundAmount }, returned: true, returnedAt: new Date() },
    });
  });

  await logAudit({
    userId: user.id,
    action: "DELETE",
    entity: "Sale",
    entityId: id,
    details: { reason, refundAmount, note: "مرتجع كامل - تم إرجاع الكمية للمخزون" },
  });

  return NextResponse.json({ ok: true });
}
