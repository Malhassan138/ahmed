import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "purchases.view")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const purchases = await prisma.purchase.findMany({
    include: { items: { include: { product: true } }, supplier: true, user: true },
    orderBy: { id: "desc" },
  });
  return NextResponse.json(purchases);
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "purchases.create")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const data = await req.json();
  const items = data.items || [];
  if (!items.length) {
    return NextResponse.json({ error: "أضف صنف واحد على الأقل" }, { status: 400 });
  }

  const total = items.reduce((s, it) => s + Number(it.quantity) * Number(it.costPrice), 0);

  const purchase = await prisma.$transaction(async (tx) => {
    const created = await tx.purchase.create({
      data: {
        supplierId: data.supplierId || null,
        userId: user.id,
        invoiceNo: data.invoiceNo || null,
        notes: data.notes || null,
        total,
        items: {
          create: items.map((it) => ({
            productId: Number(it.productId),
            quantity: Number(it.quantity),
            costPrice: Number(it.costPrice),
          })),
        },
      },
      include: { items: true },
    });

    for (const it of items) {
      await tx.product.update({
        where: { id: Number(it.productId) },
        data: {
          quantity: { increment: Number(it.quantity) },
          costPrice: Number(it.costPrice),
        },
      });
      await tx.stockMovement.create({
        data: {
          productId: Number(it.productId),
          userId: user.id,
          type: "PURCHASE",
          quantity: Number(it.quantity),
          reason: `شراء #${created.id}`,
        },
      });
    }

    return created;
  });

  await logAudit({
    userId: user.id,
    action: "CREATE",
    entity: "Purchase",
    entityId: purchase.id,
    details: { total, itemsCount: items.length },
  });

  return NextResponse.json(purchase);
}
