import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { redirect } from "next/navigation";
import PrintButton from "@/components/PrintButton";

export default async function InvoicePage({ params }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, "sales.view")) {
    return <div className="p-8 text-center text-red-600">غير مصرح لك بعرض هذه الفاتورة</div>;
  }

  const id = Number(params.id);
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: { items: { include: { product: true } }, user: true },
  });

  if (!sale) {
    return <div className="p-8 text-center text-gray-500">الفاتورة غير موجودة</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:bg-white print:py-0">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow-sm p-8 print:shadow-none print:rounded-none">
        <div className="flex justify-between items-start mb-6 print:hidden">
          <div className="text-sm text-gray-500">فاتورة رقم {sale.id}</div>
          <PrintButton />
        </div>

        <div className="text-center mb-6 border-b pb-4">
          <div className="text-xl font-bold text-brand-700">محل المستهلكات الطبية</div>
          <div className="text-sm text-gray-500">فاتورة بيع</div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm mb-6">
          <div><span className="text-gray-500">رقم الفاتورة: </span>{sale.id}</div>
          <div><span className="text-gray-500">التاريخ: </span>{new Date(sale.createdAt).toLocaleString("ar-EG")}</div>
          <div><span className="text-gray-500">العميل: </span>{sale.customerName || "-"}</div>
          <div><span className="text-gray-500">الكاشير: </span>{sale.user?.name}</div>
        </div>

        <table className="w-full text-sm text-right border-collapse mb-6">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="py-2">الصنف</th>
              <th className="py-2">الكمية</th>
              <th className="py-2">السعر</th>
              <th className="py-2">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((it) => (
              <tr key={it.id} className="border-b border-gray-100">
                <td className="py-2">{it.product?.name}</td>
                <td className="py-2">{it.quantity}</td>
                <td className="py-2">{it.sellPrice.toFixed(2)}</td>
                <td className="py-2">{(it.quantity * it.sellPrice).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between text-lg font-bold border-t pt-4">
          <span>الإجمالي</span>
          <span>{sale.total.toFixed(2)}</span>
        </div>

        <div className="text-center text-xs text-gray-400 mt-8">شكراً لتعاملكم معنا</div>
      </div>
    </div>
  );
}
