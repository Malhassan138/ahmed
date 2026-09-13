import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";

// All-time cash currently in the register:
// total sales revenue - total purchases - total expenses - total salaries paid.
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "reports.view")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const [salesAgg, purchasesAgg, expensesAgg, salariesAgg] = await Promise.all([
    prisma.sale.aggregate({ _sum: { total: true } }),
    prisma.purchase.aggregate({ _sum: { total: true } }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
    prisma.salaryPayment.aggregate({ _sum: { amount: true } }),
  ]);

  const salesTotal = salesAgg._sum.total || 0;
  const purchasesTotal = purchasesAgg._sum.total || 0;
  const expensesTotal = expensesAgg._sum.amount || 0;
  const salariesTotal = salariesAgg._sum.amount || 0;

  const cashBalance = salesTotal - purchasesTotal - expensesTotal - salariesTotal;

  return NextResponse.json({
    salesTotal,
    purchasesTotal,
    expensesTotal,
    salariesTotal,
    cashBalance,
  });
}
