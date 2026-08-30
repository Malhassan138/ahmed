import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "users.manage")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      permissions: true,
      active: true,
      createdAt: true,
    },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "users.manage")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const data = await req.json();
  if (!data.name || !data.username || !data.password) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }
  const exists = await prisma.user.findUnique({ where: { username: data.username } });
  if (exists) {
    return NextResponse.json({ error: "اسم المستخدم موجود بالفعل" }, { status: 400 });
  }
  const hashed = await hashPassword(data.password);
  const created = await prisma.user.create({
    data: {
      name: data.name,
      username: data.username,
      password: hashed,
      role: data.role || "CASHIER",
      permissions: JSON.stringify(data.permissions || []),
    },
  });
  await logAudit({
    userId: user.id,
    action: "CREATE",
    entity: "User",
    entityId: created.id,
    details: { username: created.username, role: created.role },
  });
  return NextResponse.json({ id: created.id });
}
