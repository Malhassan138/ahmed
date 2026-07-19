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
  const year = Number(searchParams.get("year")) || new Date().getFullYear();
  const month = Number(searchParams.get("month")) || new Date().getMonth() + 1; // 1-12

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

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

  // BOM so Excel opens Arabic text correctly
  const csv = "\uFEFF" + rows.join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sales-${year}-${String(month).padStart(2, "0")}.csv"`,
    },
  });
}
