import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { NextResponse } from "next/server";

// Quick on-screen summary for a chosen date range, shown before downloading the full CSV.
export async function GET(req) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "reports.view")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const start = fromParam ? new Date(fromParam + "T00:00:00") : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = toParam ? new Date(toParam + "T00:00:00") : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  if (toParam) end.setDate(end.getDate() + 1);

  const [sales, purchases] = await Promise.all([
    prisma.sale.findMany({ where: { createdAt: { gte: start, lt: end }, returned: false }, include: { items: true } }),
    prisma.purchase.findMany({ where: { createdAt: { gte: start, lt: end } } }),
  ]);

  const salesTotal = sales.reduce((s, x) => s + x.total, 0);
  const purchasesTotal = purchases.reduce((s, x) => s + x.total, 0);
  const itemsSold = sales.reduce((s, x) => s + x.items.reduce((a, i) => a + i.quantity, 0), 0);

  return NextResponse.json({
    salesCount: sales.length,
    salesTotal,
    purchasesCount: purchases.length,
    purchasesTotal,
    itemsSold,
    estimatedProfit: salesTotal - purchasesTotal,
  });
}
