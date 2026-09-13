"use client";
import { useEffect, useState } from "react";
import { FileClock } from "lucide-react";

export default function AuditPage() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetch("/api/audit").then((r) => r.json()).then((d) => setLogs(Array.isArray(d) ? d : []));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
        <FileClock className="text-brand-600" size={22} /> سجل التعديلات
      </h1>
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr><th>التاريخ</th><th>المستخدم</th><th>العملية</th><th>القسم</th><th>تفاصيل</th></tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="transition-colors hover:bg-brand-50">
                <td>{new Date(l.createdAt).toLocaleString("ar-EG")}</td>
                <td>{l.user?.name}</td>
                <td>{actionLabel(l.action)}</td>
                <td>{entityLabel(l.entity)}</td>
                <td className="text-xs text-gray-500 max-w-xs truncate" title={l.details}>{summarize(l.details)}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={5} className="text-center text-gray-400 py-6">لا يوجد سجل بعد</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function actionLabel(a) {
  return { CREATE: "إضافة", UPDATE: "تعديل", DELETE: "حذف", LOGIN: "تسجيل دخول" }[a] || a;
}
function entityLabel(e) {
  return { Product: "صنف", Purchase: "مشتريات", Sale: "مبيعات", User: "مستخدم", Inventory: "مخزون" }[e] || e;
}
function summarize(details) {
  if (!details) return "-";
  try {
    const d = JSON.parse(details);
    return JSON.stringify(d).slice(0, 120);
  } catch {
    return details;
  }
}
