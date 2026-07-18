"use client";
import { useEffect, useState } from "react";

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [me, setMe] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [cart, setCart] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    const [pu, pr, su, m] = await Promise.all([
      fetch("/api/purchases").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/suppliers").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]);
    setPurchases(Array.isArray(pu) ? pu : []);
    setProducts(Array.isArray(pr) ? pr : []);
    setSuppliers(Array.isArray(su) ? su : []);
    setMe(m.user);
  }

  useEffect(() => { load(); }, []);

  const canCreate = me?.permissions?.includes("*") || me?.permissions?.includes("purchases.create");

  function addLine() {
    setCart([...cart, { productId: "", quantity: 1, costPrice: 0 }]);
  }
  function updateLine(i, field, value) {
    const next = [...cart];
    next[i][field] = value;
    if (field === "productId") {
      const prod = products.find((p) => p.id === Number(value));
      if (prod) next[i].costPrice = prod.costPrice;
    }
    setCart(next);
  }
  function removeLine(i) {
    setCart(cart.filter((_, idx) => idx !== i));
  }

  async function addSupplier() {
    const name = prompt("اسم المورد:");
    if (!name) return;
    await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    load();
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (cart.length === 0) { setError("أضف صنف واحد على الأقل"); return; }
    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierId: supplierId ? Number(supplierId) : null, invoiceNo, items: cart }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "خطأ");
      return;
    }
    setShowForm(false);
    setCart([]);
    setSupplierId("");
    setInvoiceNo("");
    load();
  }

  const total = cart.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.costPrice || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">المشتريات</h1>
        {canCreate && (
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={addSupplier}>+ مورد</button>
            <button className="btn-primary" onClick={() => { setShowForm(true); setCart([{ productId: "", quantity: 1, costPrice: 0 }]); }}>
              + فاتورة شراء
            </button>
          </div>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th><th>التاريخ</th><th>المورد</th><th>رقم الفاتورة</th><th>الإجمالي</th><th>بواسطة</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{new Date(p.createdAt).toLocaleString("ar-EG")}</td>
                <td>{p.supplier?.name || "-"}</td>
                <td>{p.invoiceNo || "-"}</td>
                <td className="font-semibold">{p.total.toFixed(2)}</td>
                <td>{p.user?.name}</td>
              </tr>
            ))}
            {purchases.length === 0 && (
              <tr><td colSpan={6} className="text-center text-gray-400 py-6">لا توجد مشتريات بعد</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <form onSubmit={submit} className="card w-full max-w-2xl space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="font-bold text-lg">فاتورة شراء جديدة</div>
            {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">المورد</label>
                <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                  <option value="">بدون</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">رقم الفاتورة</label>
                <input className="input" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              {cart.map((line, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="label">الصنف</label>
                    <select className="input" value={line.productId} onChange={(e) => updateLine(i, "productId", e.target.value)} required>
                      <option value="">اختر</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="label">الكمية</label>
                    <input type="number" min="1" className="input" value={line.quantity} onChange={(e) => updateLine(i, "quantity", e.target.value)} required />
                  </div>
                  <div className="w-28">
                    <label className="label">سعر الشراء</label>
                    <input type="number" step="0.01" className="input" value={line.costPrice} onChange={(e) => updateLine(i, "costPrice", e.target.value)} required />
                  </div>
                  <button type="button" className="btn-danger" onClick={() => removeLine(i)}>حذف</button>
                </div>
              ))}
              <button type="button" className="btn-secondary" onClick={addLine}>+ إضافة صنف</button>
            </div>

            <div className="text-left font-bold text-lg">الإجمالي: {total.toFixed(2)}</div>

            <div className="flex gap-2 justify-end pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>إلغاء</button>
              <button className="btn-primary">حفظ الفاتورة</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
