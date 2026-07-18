import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

// Visit this route once after first deploy to create the admin account.
// Protected by SETUP_SECRET env var so strangers can't call it.
// Example: POST /api/setup { "secret": "...", "name": "...", "username": "admin", "password": "..." }
export async function POST(req) {
  const body = await req.json();
  const { secret, name, username, password } = body;

  if (!process.env.SETUP_SECRET || secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const existing = await prisma.user.count();
  if (existing > 0) {
    return NextResponse.json({ error: "تم إعداد النظام مسبقاً" }, { status: 400 });
  }

  if (!name || !username || !password) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }

  const hashed = await hashPassword(password);
  const admin = await prisma.user.create({
    data: {
      name,
      username,
      password: hashed,
      role: "ADMIN",
      permissions: JSON.stringify(["*"]),
    },
  });

  return NextResponse.json({ ok: true, id: admin.id });
}
