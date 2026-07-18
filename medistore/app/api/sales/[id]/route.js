import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";

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
