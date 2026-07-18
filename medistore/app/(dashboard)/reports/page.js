"use client";
import { useState } from "react";

const MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export default function ReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">التقارير</h1>

      <div className="card max-w-md space-y-4">
        <div className="font-semibold text-gray-700">تقرير مبيعات شهري (Excel/CSV)</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">الشهر</label>
            <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">السنة</label>
            <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <a
          href={`/api/reports/sales-csv?year=${year}&month=${month}`}
          className="btn-primary w-full"
        >
          تحميل تقرير {MONTHS[month - 1]} {year}
        </a>
        <div className="text-xs text-gray-400">
          الملف يفتح مباشرة في Excel أو Google Sheets، ويحتوي على تفاصيل كل عملية بيع وإجمالي الشهر.
        </div>
      </div>
    </div>
  );
}
