import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";

function csvEscape(val) {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// Flexible date-range sales report. Accepts ?from=YYYY-MM-DD&to=YYYY-MM-DD
// Falls back to the current month if no range is given.
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
  // "to" is inclusive of the whole day, so push it to the start of the next day.
  const end = toParam ? new Date(toParam + "T00:00:00") : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  if (toParam) end.setDate(end.getDate() + 1);

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: start, lt: end } },
    include: { items: { include: { product: true } }, user: true },
    orderBy: { id: "asc" },
  });

  const rows = [
    ["رقم الفاتورة", "التاريخ", "العميل", "الكاشير", "الصنف", "الكمية", "سعر الوحدة", "إجمالي السطر"].join(","),
  ];

  let grandTotal = 0;
  for (const sale of sales) {
    for (const item of sale.items) {
      const lineTotal = item.quantity * item.sellPrice;
      grandTotal += lineTotal;
      rows.push(
        [
          sale.id,
          new Date(sale.createdAt).toLocaleString("ar-EG"),
          sale.customerName || "-",
          sale.user?.name || "-",
          item.product?.name || "-",
          item.quantity,
          item.sellPrice.toFixed(2),
          lineTotal.toFixed(2),
        ]
          .map(csvEscape)
          .join(",")
      );
    }
  }
  rows.push("");
  rows.push(["", "", "", "", "", "", "الإجمالي الكلي", grandTotal.toFixed(2)].map(csvEscape).join(","));

  const csv = "\uFEFF" + rows.join("\n"); // BOM so Excel opens Arabic text correctly

  const label = fromParam && toParam ? `${fromParam}_to_${toParam}` : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sales-${label}.csv"`,
    },
  });
}
