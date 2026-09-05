"use client";
import { useEffect, useState } from "react";
import { Package, Plus, Tag } from "lucide-react";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [me, setMe] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState("");

  function emptyForm() {
    return { sku: "", name: "", unit: "قطعة", categoryId: "", costPrice: 0, sellPrice: 0, quantity: 0, minStock: 0 };
  }

  async function load() {
    const [p, c, m] = await Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]);
    setProducts(Array.isArray(p) ? p : []);
    setCategories(Array.isArray(c) ? c : []);
    setMe(m.user);
  }

  useEffect(() => {
    load();
  }, []);

  const canEdit = me?.permissions?.includes("*") || me?.permissions?.includes("products.edit");

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setShowForm(true);
    setError("");
  }

  function openEdit(p) {
    setEditing(p);
    setForm({
      sku: p.sku,
      name: p.name,
      unit: p.unit,
      categoryId: p.categoryId || "",
      costPrice: p.costPrice,
      sellPrice: p.sellPrice,
      quantity: p.quantity,
      minStock: p.minStock,
    });
    setShowForm(true);
    setError("");
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    const payload = { ...form, categoryId: form.categoryId ? Number(form.categoryId) : null };
    const res = await fetch(editing ? `/api/products/${editing.id}` : "/api/products", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "خطأ");
      return;
    }
    setShowForm(false);
    load();
  }

  async function remove(p) {
    if (!confirm(`إخفاء الصنف "${p.name}"؟`)) return;
    await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    load();
  }

  async function addCategory() {
    const name = prompt("اسم التصنيف الجديد:");
    if (!name) return;
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Package className="text-brand-600" size={22} /> الأصناف
        </h1>
        {canEdit && (
          <div className="flex gap-2">
            <button className="btn-secondary flex items-center gap-1" onClick={addCategory}><Tag size={16} /> تصنيف</button>
            <button className="btn-primary flex items-center gap-1" onClick={openNew}><Plus size={16} /> صنف جديد</button>
          </div>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>الكود</th>
              <th>الاسم</th>
              <th>التصنيف</th>
              <th>الوحدة</th>
              <th>سعر الشراء</th>
              <th>سعر البيع</th>
              <th>الكمية</th>
              <th>الحد الأدنى</th>
              {canEdit && <th>إجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {products.filter(p => p.active).map((p) => (
              <tr key={p.id} className={`transition-colors hover:bg-brand-50 ${p.quantity <= p.minStock ? "bg-red-50" : ""}`}>
                <td>{p.sku}</td>
                <td>{p.name}</td>
                <td>{p.category?.name || "-"}</td>
                <td>{p.unit}</td>
                <td>{p.costPrice}</td>
                <td>{p.sellPrice}</td>
                <td className="font-semibold">{p.quantity}</td>
                <td>{p.minStock}</td>
                {canEdit && (
                  <td className="flex gap-2">
                    <button className="text-brand-600 hover:underline text-xs" onClick={() => openEdit(p)}>تعديل</button>
                    <button className="text-red-600 hover:underline text-xs" onClick={() => remove(p)}>حذف</button>
                  </td>
                )}
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan={9} className="text-center text-gray-400 py-6">لا توجد أصناف بعد</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <form onSubmit={submit} className="card w-full max-w-lg space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="font-bold text-lg">{editing ? "تعديل صنف" : "صنف جديد"}</div>
            {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">الكود (SKU)</label>
                <input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} disabled={!!editing} required />
              </div>
              <div>
                <label className="label">الاسم</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">الوحدة</label>
                <input className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
              <div>
                <label className="label">التصنيف</label>
                <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">بدون</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">سعر الشراء</label>
                <input type="number" step="0.01" className="input" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
              </div>
              <div>
                <label className="label">سعر البيع</label>
                <input type="number" step="0.01" className="input" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: e.target.value })} />
              </div>
              {!editing && (
                <div>
                  <label className="label">الكمية الابتدائية</label>
                  <input type="number" className="input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </div>
              )}
              <div>
                <label className="label">الحد الأدنى للتنبيه</label>
                <input type="number" className="input" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
              </div>
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
