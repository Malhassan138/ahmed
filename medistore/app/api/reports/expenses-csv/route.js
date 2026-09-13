import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";

function csvEscape(val) {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "reports.view")) {
    return new Response(JSON.stringify({ error: "غير مصرح" }), { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const start = fromParam ? new Date(fromParam + "T00:00:00") : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = toParam ? new Date(toParam + "T00:00:00") : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  if (toParam) end.setDate(end.getDate() + 1);

  const expenses = await prisma.expense.findMany({
    where: { createdAt: { gte: start, lt: end } },
    include: { user: true },
    orderBy: { id: "asc" },
  });

  const rows = [["التاريخ", "الوصف", "التصنيف", "المبلغ", "بواسطة"].join(",")];
  let total = 0;
  for (const e of expenses) {
    total += e.amount;
    rows.push(
      [
        new Date(e.createdAt).toLocaleString("ar-EG"),
        e.description,
        e.category || "-",
        e.amount.toFixed(2),
        e.user?.name || "-",
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  rows.push("");
  rows.push(["", "", "", "الإجمالي الكلي", total.toFixed(2)].map(csvEscape).join(","));

  const csv = "\uFEFF" + rows.join("\n");
  const label = fromParam && toParam ? `${fromParam}_to_${toParam}` : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="expenses-${label}.csv"`,
    },
  });
}
