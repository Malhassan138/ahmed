"use client";
import { useEffect, useState } from "react";
import { BarChart3, Download, ShoppingBag, Truck, TrendingUp, Package } from "lucide-react";

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const today = new Date();

  const [from, setFrom] = useState(toISODate(today));
  const [to, setTo] = useState(toISODate(today));
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadSummary() {
    setLoading(true);
    const res = await fetch(`/api/reports/summary?from=${from}&to=${to}`);
    const data = await res.json();
    setSummary(data);
    setLoading(false);
  }

  useEffect(() => { loadSummary(); }, []);

  function quickRange(type) {
    const now = new Date();
    let start;
    if (type === "today") start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (type === "week") start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    else if (type === "month") start = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (type === "year") start = new Date(now.getFullYear(), 0, 1);
    setFrom(toISODate(start));
    setTo(toISODate(now));
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
        <BarChart3 className="text-brand-600" size={22} /> التقارير
      </h1>

      <div className="card bg-brand-50 border-brand-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <div className="font-bold text-brand-700">تقرير اليوم بضغطة واحدة</div>
          <div className="text-sm text-gray-500">{toISODate(today)}</div>
        </div>
        <div className="flex gap-2">
          <a href={`/api/reports/sales-csv?from=${toISODate(today)}&to=${toISODate(today)}`} className="btn-primary flex items-center gap-2">
            <Download size={16} /> مبيعات اليوم
          </a>
          <a href={`/api/reports/purchases-csv?from=${toISODate(today)}&to=${toISODate(today)}`} className="btn-secondary flex items-center gap-2">
            <Download size={16} /> مشتريات اليوم
          </a>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="font-semibold text-gray-700">اختر الفترة</div>
        <div className="flex flex-wrap gap-2">
          {[
            ["today", "اليوم"],
            ["week", "آخر 7 أيام"],
            ["month", "هذا الشهر"],
            ["year", "هذه السنة"],
          ].map(([key, label]) => (
            <button key={key} className="btn-secondary" onClick={() => quickRange(key)}>{label}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <div>
            <label className="label">من تاريخ</label>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">إلى تاريخ</label>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <button className="btn-primary" onClick={loadSummary} disabled={loading}>
          {loading ? "جاري الحساب..." : "عرض ملخص الفترة"}
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard icon={ShoppingBag} label="عدد فواتير البيع" value={summary.salesCount} />
          <SummaryCard icon={TrendingUp} label="إجمالي المبيعات" value={summary.salesTotal.toFixed(2)} />
          <SummaryCard icon={Truck} label="إجمالي المشتريات" value={summary.purchasesTotal.toFixed(2)} />
          <SummaryCard icon={Package} label="عدد القطع المباعة" value={summary.itemsSold} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card space-y-3">
          <div className="font-semibold text-gray-700 flex items-center gap-2"><ShoppingBag size={18} className="text-brand-600" /> تقرير المبيعات</div>
          <p className="text-sm text-gray-500">تفاصيل كل فاتورة بيع في الفترة المحددة، جاهز للفتح في Excel.</p>
          <a
            href={`/api/reports/sales-csv?from=${from}&to=${to}`}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Download size={16} /> تحميل تقرير المبيعات
          </a>
        </div>
        <div className="card space-y-3">
          <div className="font-semibold text-gray-700 flex items-center gap-2"><Truck size={18} className="text-brand-600" /> تقرير المشتريات</div>
          <p className="text-sm text-gray-500">تفاصيل كل فاتورة شراء في الفترة المحددة، جاهز للفتح في Excel.</p>
          <a
            href={`/api/reports/purchases-csv?from=${from}&to=${to}`}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Download size={16} /> تحميل تقرير المشتريات
          </a>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div className="card flex items-center gap-3 transition-shadow hover:shadow-md">
      <div className="rounded-lg p-2 bg-brand-50 text-brand-600">
        <Icon size={20} />
      </div>
      <div>
        <div className="text-sm text-gray-500">{label}</div>
        <div className="text-xl font-bold text-gray-800 mt-1">{value}</div>
      </div>
    </div>
  );
}
