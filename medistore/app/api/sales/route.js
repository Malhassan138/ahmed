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
  const rawItems = data.items || [];
  if (!rawItems.length) {
    return NextResponse.json({ error: "أضف صنف واحد على الأقل" }, { status: 400 });
  }

  const canEditPrice = hasPermission(user, "sales.edit_price");

  // Load products, check stock, and lock down price editing server-side
  // (a user without the permission can't change prices even by calling the API directly).
  const items = [];
  let hadDiscount = false;
  for (const it of rawItems) {
    const product = await prisma.product.findUnique({ where: { id: Number(it.productId) } });
    if (!product || product.quantity < Number(it.quantity)) {
      return NextResponse.json(
        { error: `الكمية غير متوفرة للصنف: ${product?.name || it.productId}` },
        { status: 400 }
      );
    }
    const requestedPrice = Number(it.sellPrice);
    const sellPrice = canEditPrice && requestedPrice >= 0 ? requestedPrice : product.sellPrice;
    if (sellPrice !== product.sellPrice) hadDiscount = true;
    items.push({ productId: product.id, quantity: Number(it.quantity), sellPrice });
  }

  const total = items.reduce((s, it) => s + it.quantity * it.sellPrice, 0);

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        userId: user.id,
        customerName: data.customerName || null,
        total,
        paidAmount: data.paidAmount != null ? Number(data.paidAmount) : total,
        items: {
          create: items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            sellPrice: it.sellPrice,
          })),
        },
      },
      include: { items: true },
    });

    for (const it of items) {
      await tx.product.update({
        where: { id: it.productId },
        data: { quantity: { decrement: it.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: it.productId,
          userId: user.id,
          type: "SALE",
          quantity: it.quantity,
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
    details: { total, itemsCount: items.length, hadDiscount },
  });

  return NextResponse.json(sale);
}
