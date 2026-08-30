import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// Voids a sale and returns its items to stock (a "return"/refund).
// The sale record is kept (for audit history) but excluded from revenue totals.
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

  await prisma.$transaction(async (tx) => {
    for (const item of sale.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { increment: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          userId: user.id,
          type: "RETURN",
          quantity: item.quantity,
          reason: `مرتجع من فاتورة #${sale.id}${reason ? " - " + reason : ""}`,
        },
      });
    }
    await tx.sale.update({
      where: { id },
      data: { returned: true, returnedAt: new Date() },
    });
  });

  await logAudit({
    userId: user.id,
    action: "DELETE",
    entity: "Sale",
    entityId: id,
    details: { reason, total: sale.total, note: "مرتجع - تم إرجاع الكمية للمخزون" },
  });

  return NextResponse.json({ ok: true });
}
