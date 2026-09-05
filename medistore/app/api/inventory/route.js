import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "inventory.view")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const moves = await prisma.stockMovement.findMany({
    include: { product: true, user: true },
    orderBy: { id: "desc" },
    take: 300,
  });
  return NextResponse.json(moves);
}

// Manual stock adjustment (correcting count after physical inventory)
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "inventory.adjust")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { productId, quantity, direction, reason } = await req.json();
  if (!productId || !quantity || !["IN", "OUT"].includes(direction)) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: Number(productId) } });
  if (!product) return NextResponse.json({ error: "الصنف غير موجود" }, { status: 404 });

  if (direction === "OUT" && product.quantity < Number(quantity)) {
    return NextResponse.json({ error: "الكمية أكبر من المتوفر" }, { status: 400 });
  }

  const updated = await prisma.product.update({
    where: { id: Number(productId) },
    data: {
      quantity:
        direction === "IN"
          ? { increment: Number(quantity) }
          : { decrement: Number(quantity) },
    },
  });

  await prisma.stockMovement.create({
    data: {
      productId: Number(productId),
      userId: user.id,
      type: direction === "IN" ? "ADJUST_IN" : "ADJUST_OUT",
      quantity: Number(quantity),
      reason: reason || "تعديل جرد",
    },
  });

  await logAudit({
    userId: user.id,
    action: "UPDATE",
    entity: "Inventory",
    entityId: Number(productId),
    details: { direction, quantity, reason },
  });

  return NextResponse.json(updated);
}
