import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(categories);
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "products.edit")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
  const category = await prisma.category.create({ data: { name } });
  return NextResponse.json(category);
}
