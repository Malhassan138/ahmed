import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  const [productsCount, salesToday, purchasesTotal, allProducts] = await Promise.all([
    prisma.product.count({ where: { active: true } }),
    prisma.sale.findMany({
      where: {
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.purchase.aggregate({ _sum: { total: true } }),
    prisma.product.findMany({ where: { active: true } }),
  ]);

  // Prisma can't compare two columns directly, so filter low-stock items in JS.
  const lowStockList = allProducts.filter((p) => p.quantity <= p.minStock);

  const salesTodayTotal = salesToday.reduce((s, x) => s + x.total, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-800">مرحباً {user?.name} 👋</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="عدد الأصناف" value={productsCount} />
        <StatCard label="مبيعات اليوم" value={`${salesTodayTotal.toFixed(2)}`} />
        <StatCard label="إجمالي المشتريات" value={`${(purchasesTotal._sum.total || 0).toFixed(2)}`} />
        <StatCard label="أصناف تحتاج تموين" value={lowStockList.length} highlight={lowStockList.length > 0} />
      </div>

      {hasPermission(user, "inventory.view") && lowStockList.length > 0 && (
        <div className="card">
          <div className="font-semibold text-gray-700 mb-3">أصناف وصلت للحد الأدنى</div>
          <table className="data-table">
            <thead>
              <tr>
                <th>الصنف</th>
                <th>الكمية الحالية</th>
                <th>الحد الأدنى</th>
              </tr>
            </thead>
            <tbody>
              {lowStockList.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td className="text-red-600 font-semibold">{p.quantity}</td>
                  <td>{p.minStock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }) {
  return (
    <div className={`card ${highlight ? "border-red-300 bg-red-50" : ""}`}>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-800 mt-1">{value}</div>
    </div>
  );
}
