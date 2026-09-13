import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "sales.view")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const id = Number(params.id);
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: { items: { include: { product: true } }, user: true },
  });
  if (!sale) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json(sale);
}

// Permanently deletes a sale from the record (not just marking it returned).
// Restocks whatever hadn't already been returned, then removes the row entirely.
// Kept separate from the "return" flow, which preserves the sale for history.
export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "sales.delete")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const id = Number(params.id);
  const sale = await prisma.sale.findUnique({ where: { id }, include: { items: true } });
  if (!sale) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    for (const item of sale.items) {
      const remaining = item.quantity - item.returnedQty;
      if (remaining > 0) {
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
            reason: `حذف فاتورة #${sale.id}`,
          },
        });
      }
    }
    await tx.sale.delete({ where: { id } }); // cascades SaleItem
  });

  await logAudit({
    userId: user.id,
    action: "DELETE",
    entity: "Sale",
    entityId: id,
    details: { total: sale.total, note: "حذف نهائي من السجل" },
  });

  return NextResponse.json({ ok: true });
}
