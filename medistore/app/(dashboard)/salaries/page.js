"use client";
import { useEffect, useState } from "react";
import { Wallet, Plus, Trash2 } from "lucide-react";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export default function SalariesPage() {
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const now = new Date();
  const [form, setForm] = useState({ userId: "", amount: "", month: now.getMonth() + 1, year: now.getFullYear(), notes: "" });

  async function load() {
    const [u, p] = await Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/salaries").then((r) => r.json()),
    ]);
    setUsers(Array.isArray(u) ? u.filter((x) => x.active) : []);
    setPayments(Array.isArray(p) ? p : []);
  }
  useEffect(() => { load(); }, []);

  function openNew(userId) {
    const u = users.find((x) => x.id === userId);
    setForm({ userId, amount: u?.baseSalary || "", month: now.getMonth() + 1, year: now.getFullYear(), notes: "" });
    setShowForm(true);
    setError("");
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/salaries", {
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

  async function updateBaseSalary(userId, value) {
    await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseSalary: value }),
    });
    load();
  }

  async function deletePayment(id) {
    if (!confirm("حذف سجل هذا الراتب؟")) return;
    await fetch(`/api/salaries/${id}`, { method: "DELETE" });
    load();
  }

  const totalThisMonth = payments
    .filter((p) => p.month === now.getMonth() + 1 && p.year === now.getFullYear())
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
        <Wallet className="text-brand-600" size={22} /> المرتبات
      </h1>

      <div className="card">
        <div className="font-semibold text-gray-700 mb-3">الموظفين والراتب الأساسي</div>
        <table className="data-table">
          <thead><tr><th>الاسم</th><th>الدور</th><th>الراتب الأساسي</th><th>إجراء</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.role}</td>
                <td>
                  <input
                    type="number"
                    className="input w-28 py-1"
                    defaultValue={u.baseSalary || ""}
                    placeholder="غير محدد"
                    onBlur={(e) => e.target.value !== String(u.baseSalary || "") && updateBaseSalary(u.id, e.target.value)}
                  />
                </td>
                <td>
                  <button className="btn-primary flex items-center gap-1 py-1 px-2 text-xs" onClick={() => openNew(u.id)}>
                    <Plus size={14} /> تسجيل دفعة
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-gray-700">سجل المرتبات المدفوعة</div>
          <div className="text-sm text-gray-500">إجمالي هذا الشهر: <span className="font-bold text-gray-800">{totalThisMonth.toFixed(2)}</span></div>
        </div>
        <table className="data-table">
          <thead><tr><th>الموظف</th><th>الشهر</th><th>المبلغ</th><th>تاريخ الدفع</th><th>ملاحظات</th><th></th></tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{p.user?.name}</td>
                <td>{MONTHS[p.month - 1]} {p.year}</td>
                <td className="font-semibold">{p.amount.toFixed(2)}</td>
                <td>{new Date(p.paidAt).toLocaleDateString("ar-EG")}</td>
                <td>{p.notes || "-"}</td>
                <td><button className="text-red-600" onClick={() => deletePayment(p.id)}><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan={6} className="text-center text-gray-400 py-6">لا توجد دفعات مسجلة بعد</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <form onSubmit={submit} className="card w-full max-w-sm space-y-3">
            <div className="font-bold text-lg">تسجيل دفعة راتب</div>
            {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
            <div>
              <label className="label">الموظف</label>
              <select className="input" value={form.userId} onChange={(e) => setForm({ ...form, userId: Number(e.target.value) })} required>
                <option value="">اختر</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">الشهر</label>
                <select className="input" value={form.month} onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">السنة</label>
                <input type="number" className="input" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <label className="label">المبلغ</label>
              <input type="number" step="0.01" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div>
              <label className="label">ملاحظات (اختياري)</label>
              <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
