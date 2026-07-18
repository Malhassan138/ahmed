import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "sales.view")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const sales = await prisma.sale.findMany({
    include: { items: { include: { product: true } }, user: true },
    orderBy: { id: "desc" },
    take: 200,
  });
  return NextResponse.json(sales);
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "sales.create")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const data = await req.json();
  const items = data.items || [];
  if (!items.length) {
    return NextResponse.json({ error: "أضف صنف واحد على الأقل" }, { status: 400 });
  }

  // Check stock availability first
  for (const it of items) {
    const product = await prisma.product.findUnique({ where: { id: Number(it.productId) } });
    if (!product || product.quantity < Number(it.quantity)) {
      return NextResponse.json(
        { error: `الكمية غير متوفرة للصنف: ${product?.name || it.productId}` },
        { status: 400 }
      );
    }
  }

  const total = items.reduce((s, it) => s + Number(it.quantity) * Number(it.sellPrice), 0);

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        userId: user.id,
        customerName: data.customerName || null,
        total,
        paidAmount: data.paidAmount != null ? Number(data.paidAmount) : total,
        items: {
          create: items.map((it) => ({
            productId: Number(it.productId),
            quantity: Number(it.quantity),
            sellPrice: Number(it.sellPrice),
          })),
        },
      },
      include: { items: true },
    });

    for (const it of items) {
      await tx.product.update({
        where: { id: Number(it.productId) },
        data: { quantity: { decrement: Number(it.quantity) } },
      });
      await tx.stockMovement.create({
        data: {
          productId: Number(it.productId),
          userId: user.id,
          type: "SALE",
          quantity: Number(it.quantity),
          reason: `بيع #${created.id}`,
        },
      });
    }

    return created;
  });

  await logAudit({
    userId: user.id,
    action: "CREATE",
    entity: "Sale",
    entityId: sale.id,
    details: { total, itemsCount: items.length },
  });

  return NextResponse.json(sale);
}
