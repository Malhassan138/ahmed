import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(suppliers);
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "purchases.create")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { name, phone, address } = await req.json();
  if (!name) return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
  const supplier = await prisma.supplier.create({ data: { name, phone, address } });
  return NextResponse.json(supplier);
}
