import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "products.edit")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const id = Number(params.id);
  const data = await req.json();
  const before = await prisma.product.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const updated = await prisma.product.update({
    where: { id },
    data: {
      name: data.name ?? before.name,
      sku: data.sku ?? before.sku,
      unit: data.unit ?? before.unit,
      categoryId: data.categoryId ?? before.categoryId,
      costPrice: data.costPrice != null ? Number(data.costPrice) : before.costPrice,
      sellPrice: data.sellPrice != null ? Number(data.sellPrice) : before.sellPrice,
      minStock: data.minStock != null ? Number(data.minStock) : before.minStock,
      active: data.active != null ? data.active : before.active,
    },
  });

  await logAudit({
    userId: user.id,
    action: "UPDATE",
    entity: "Product",
    entityId: id,
    details: { before, after: updated },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "products.edit")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const id = Number(params.id);
  const before = await prisma.product.findUnique({ where: { id } });
  await prisma.product.update({ where: { id }, data: { active: false } });
  await logAudit({
    userId: user.id,
    action: "DELETE",
    entity: "Product",
    entityId: id,
    details: { name: before?.name },
  });
  return NextResponse.json({ ok: true });
}
