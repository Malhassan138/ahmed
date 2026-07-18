import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "products.view")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { id: "desc" },
  });
  return NextResponse.json(products);
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "products.edit")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const data = await req.json();
  if (!data.sku || !data.name) {
    return NextResponse.json({ error: "الكود والاسم مطلوبان" }, { status: 400 });
  }
  const product = await prisma.product.create({
    data: {
      sku: data.sku,
      name: data.name,
      unit: data.unit || "قطعة",
      categoryId: data.categoryId || null,
      costPrice: Number(data.costPrice) || 0,
      sellPrice: Number(data.sellPrice) || 0,
      quantity: Number(data.quantity) || 0,
      minStock: Number(data.minStock) || 0,
    },
  });
  await logAudit({
    userId: user.id,
    action: "CREATE",
    entity: "Product",
    entityId: product.id,
    details: { name: product.name, sku: product.sku },
  });
  return NextResponse.json(product);
}
