"use client";
import { useEffect, useState } from "react";
import { Boxes, PlusCircle, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [moves, setMoves] = useState([]);
  const [me, setMe] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ productId: "", quantity: 1, direction: "IN", reason: "" });
  const [error, setError] = useState("");
  const [tab, setTab] = useState("stock");

  async function load() {
    const [p, mv, m] = await Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/inventory").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]);
    setProducts(Array.isArray(p) ? p.filter((x) => x.active) : []);
    setMoves(Array.isArray(mv) ? mv : []);
    setMe(m.user);
  }

  useEffect(() => { load(); }, []);

  const canAdjust = me?.permissions?.includes("*") || me?.permissions?.includes("inventory.adjust");

  async function submit(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/inventory", {
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
    setForm({ productId: "", quantity: 1, direction: "IN", reason: "" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Boxes className="text-brand-600" size={22} /> المخزون
        </h1>
        {canAdjust && (
          <button className="btn-primary flex items-center gap-1" onClick={() => setShowForm(true)}><PlusCircle size={16} /> تعديل جرد</button>
        )}
      </div>

      <div className="flex gap-2">
        <button className={tab === "stock" ? "btn-primary" : "btn-secondary"} onClick={() => setTab("stock")}>الأرصدة الحالية</button>
        <button className={tab === "moves" ? "btn-primary" : "btn-secondary"} onClick={() => setTab("moves")}>حركة المخزون</button>
      </div>

      {tab === "stock" && (
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>الصنف</th><th>الكود</th><th>الكمية</th><th>الحد الأدنى</th><th>الحالة</th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className={p.quantity <= p.minStock ? "bg-red-50" : ""}>
                  <td>{p.name}</td>
                  <td>{p.sku}</td>
                  <td className="font-semibold">{p.quantity}</td>
                  <td>{p.minStock}</td>
                  <td>{p.quantity <= p.minStock ? <span className="text-red-600 text-xs">يحتاج تموين</span> : <span className="text-green-600 text-xs">جيد</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "moves" && (
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>التاريخ</th><th>الصنف</th><th>النوع</th><th>الكمية</th><th>السبب</th><th>بواسطة</th></tr></thead>
            <tbody>
              {moves.map((mv) => (
                <tr key={mv.id}>
                  <td>{new Date(mv.createdAt).toLocaleString("ar-EG")}</td>
                  <td>{mv.product?.name}</td>
                  <td>{typeLabel(mv.type)}</td>
                  <td className={`flex items-center gap-1 ${["SALE", "ADJUST_OUT"].includes(mv.type) ? "text-red-600" : "text-green-600"}`}>
                    {["SALE", "ADJUST_OUT"].includes(mv.type) ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />}
                    {mv.quantity}
                  </td>
                  <td>{mv.reason || "-"}</td>
                  <td>{mv.user?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <form onSubmit={submit} className="card w-full max-w-md space-y-3">
            <div className="font-bold text-lg">تعديل جرد المخزون</div>
            {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
            <div>
              <label className="label">الصنف</label>
              <select className="input" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required>
                <option value="">اختر</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} (المتوفر: {p.quantity})</option>)}
              </select>
            </div>
            <div>
              <label className="label">النوع</label>
              <select className="input" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
                <option value="IN">إضافة للمخزون</option>
                <option value="OUT">خصم من المخزون</option>
              </select>
            </div>
            <div>
              <label className="label">الكمية</label>
              <input type="number" min="1" className="input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
            </div>
            <div>
              <label className="label">السبب</label>
              <input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="مثال: جرد فعلي، تالف، ..." />
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

function typeLabel(t) {
  return { PURCHASE: "شراء", SALE: "بيع", ADJUST_IN: "تعديل (إضافة)", ADJUST_OUT: "تعديل (خصم)" }[t] || t;
}
