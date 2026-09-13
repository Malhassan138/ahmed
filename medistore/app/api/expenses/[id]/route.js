import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "expenses.manage")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const id = Number(params.id);
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  await prisma.expense.delete({ where: { id } });

  await logAudit({
    userId: user.id,
    action: "DELETE",
    entity: "Expense",
    entityId: id,
    details: { description: expense.description, amount: expense.amount },
  });

  return NextResponse.json({ ok: true });
}
