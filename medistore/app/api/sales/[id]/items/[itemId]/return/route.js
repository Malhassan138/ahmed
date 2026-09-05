import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// Returns part (or all) of a single line item from a sale — a partial return.
// Restocks the returned quantity and removes its value from the sale's recorded total
// so it no longer counts toward revenue/reports.
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "sales.return")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const saleId = Number(params.id);
  const itemId = Number(params.itemId);
  const { quantity, reason } = await req.json();
  const qty = Number(quantity);

  const item = await prisma.saleItem.findUnique({ where: { id: itemId } });
  if (!item || item.saleId !== saleId) {
    return NextResponse.json({ error: "الصنف غير موجود في هذه الفاتورة" }, { status: 404 });
  }

  const remaining = item.quantity - item.returnedQty;
  if (!qty || qty <= 0 || qty > remaining) {
    return NextResponse.json({ error: `الكمية غير صحيحة. المتاح للإرجاع: ${remaining}` }, { status: 400 });
  }

  const refundAmount = qty * item.sellPrice;

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: item.productId },
      data: { quantity: { increment: qty } },
    });
    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        userId: user.id,
        type: "RETURN",
        quantity: qty,
        reason: `مرتجع جزئي من فاتورة #${saleId}${reason ? " - " + reason : ""}`,
      },
    });
    await tx.saleItem.update({
      where: { id: itemId },
      data: { returnedQty: { increment: qty } },
    });
    await tx.sale.update({
      where: { id: saleId },
      data: { total: { decrement: refundAmount } },
    });

    // If every item in the sale has now been fully returned, mark the whole sale as returned.
    const allItems = await tx.saleItem.findMany({ where: { saleId } });
    const fullyReturned = allItems.every((it) => it.id === itemId
      ? it.returnedQty + qty >= it.quantity
      : it.returnedQty >= it.quantity);
    if (fullyReturned) {
      await tx.sale.update({ where: { id: saleId }, data: { returned: true, returnedAt: new Date() } });
    }
  });

  await logAudit({
    userId: user.id,
    action: "UPDATE",
    entity: "Sale",
    entityId: saleId,
    details: { note: "مرتجع جزئي", itemId, quantity: qty, refundAmount, reason },
  });

  return NextResponse.json({ ok: true });
}
