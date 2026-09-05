import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken, getCookieName } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req) {
  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: "أدخل اسم المستخدم وكلمة المرور" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.active) {
    return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.password);
  if (!ok) {
    return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
  }

  const token = signToken(user);
  await logAudit({ userId: user.id, action: "LOGIN", entity: "User", entityId: user.id });

  const res = NextResponse.json({
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
  });
  res.cookies.set(getCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
