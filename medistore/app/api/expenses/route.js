import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "expenses.manage")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const expenses = await prisma.expense.findMany({
    include: { user: true },
    orderBy: { id: "desc" },
  });
  return NextResponse.json(expenses);
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "expenses.manage")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { description, category, amount } = await req.json();
  if (!description || !amount) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }
  const expense = await prisma.expense.create({
    data: {
      description,
      category: category || null,
      amount: Number(amount),
      userId: user.id,
    },
  });
  await logAudit({
    userId: user.id,
    action: "CREATE",
    entity: "Expense",
    entityId: expense.id,
    details: { description, amount },
  });
  return NextResponse.json(expense);
}
