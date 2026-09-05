import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";

function csvEscape(val) {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// Flexible date-range purchases report. Accepts ?from=YYYY-MM-DD&to=YYYY-MM-DD
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

  const purchases = await prisma.purchase.findMany({
    where: { createdAt: { gte: start, lt: end } },
    include: { items: { include: { product: true } }, supplier: true, user: true },
    orderBy: { id: "asc" },
  });

  const rows = [
    ["رقم الفاتورة", "التاريخ", "المورد", "بواسطة", "الصنف", "الكمية", "سعر الشراء", "إجمالي السطر"].join(","),
  ];

  let grandTotal = 0;
  for (const p of purchases) {
    for (const item of p.items) {
      const lineTotal = item.quantity * item.costPrice;
      grandTotal += lineTotal;
      rows.push(
        [
          p.id,
          new Date(p.createdAt).toLocaleString("ar-EG"),
          p.supplier?.name || "-",
          p.user?.name || "-",
          item.product?.name || "-",
          item.quantity,
          item.costPrice.toFixed(2),
          lineTotal.toFixed(2),
        ]
          .map(csvEscape)
          .join(",")
      );
    }
  }
  rows.push("");
  rows.push(["", "", "", "", "", "", "الإجمالي الكلي", grandTotal.toFixed(2)].map(csvEscape).join(","));

  const csv = "\uFEFF" + rows.join("\n");
  const label = fromParam && toParam ? `${fromParam}_to_${toParam}` : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="purchases-${label}.csv"`,
    },
  });
}
