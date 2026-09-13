import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// Delete a recorded salary payment (e.g. entered by mistake).
export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "salaries.manage")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const id = Number(params.id);
  const payment = await prisma.salaryPayment.findUnique({ where: { id } });
  if (!payment) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  await prisma.salaryPayment.delete({ where: { id } });

  await logAudit({
    userId: user.id,
    action: "DELETE",
    entity: "Salary",
    entityId: id,
    details: { forUserId: payment.userId, amount: payment.amount },
  });

  return NextResponse.json({ ok: true });
}
