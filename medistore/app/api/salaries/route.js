import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "salaries.manage")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const payments = await prisma.salaryPayment.findMany({
    include: { user: true },
    orderBy: { id: "desc" },
  });
  return NextResponse.json(payments);
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "salaries.manage")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { userId, amount, month, year, notes } = await req.json();
  if (!userId || !amount || !month || !year) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }
  const payment = await prisma.salaryPayment.create({
    data: {
      userId: Number(userId),
      amount: Number(amount),
      month: Number(month),
      year: Number(year),
      notes: notes || null,
    },
  });
  await logAudit({
    userId: user.id,
    action: "CREATE",
    entity: "Salary",
    entityId: payment.id,
    details: { forUserId: userId, amount, month, year },
  });
  return NextResponse.json(payment);
}
