"use client";
import { useEffect, useState } from "react";
import { Receipt, Plus, Trash2 } from "lucide-react";

const CATEGORIES = ["إيجار", "كهرباء وماء", "نقل ومواصلات", "صيانة", "اتصالات وإنترنت", "أخرى"];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ description: "", category: "", amount: "" });

  async function load() {
    const e = await fetch("/api/expenses").then((r) => r.json());
    setExpenses(Array.isArray(e) ? e : []);
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setForm({ description: "", category: "", amount: "" });
    setShowForm(true);
    setError("");
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "خطأ");
      return;
    }
    setShowForm(false);
    load();
  }

  async function deleteExpense(id) {
    if (!confirm("حذف هذا المصروف؟")) return;
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    load();
  }

  const totalThisMonth = expenses
    .filter((e) => {
      const d = new Date(e.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Receipt className="text-brand-600" size={22} /> المصروفات
        </h1>
        <button className="btn-primary flex items-center gap-1" onClick={openNew}>
          <Plus size={16} /> مصروف جديد
        </button>
      </div>

      <div className="card">
        <div className="text-sm text-gray-500 mb-3">إجمالي مصروفات هذا الشهر: <span className="font-bold text-gray-800">{totalThisMonth.toFixed(2)}</span></div>
        <table className="data-table">
          <thead><tr><th>التاريخ</th><th>الوصف</th><th>التصنيف</th><th>المبلغ</th><th>بواسطة</th><th></th></tr></thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id}>
                <td>{new Date(e.createdAt).toLocaleDateString("ar-EG")}</td>
                <td>{e.description}</td>
                <td>{e.category || "-"}</td>
                <td className="font-semibold text-red-600">{e.amount.toFixed(2)}</td>
                <td>{e.user?.name}</td>
                <td><button className="text-red-600" onClick={() => deleteExpense(e.id)}><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr><td colSpan={6} className="text-center text-gray-400 py-6">لا توجد مصروفات مسجلة بعد</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <form onSubmit={submit} className="card w-full max-w-sm space-y-3">
            <div className="font-bold text-lg">مصروف جديد</div>
            {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
            <div>
              <label className="label">الوصف</label>
              <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="مثال: فاتورة كهرباء" required />
            </div>
            <div>
              <label className="label">التصنيف (اختياري)</label>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">بدون</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">المبلغ</label>
              <input type="number" step="0.01" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>إلغاء</button>
              <button className="btn-primary">حفظ</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
