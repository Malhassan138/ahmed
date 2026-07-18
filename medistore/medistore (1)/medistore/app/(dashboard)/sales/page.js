"use client";
import { useEffect, useState } from "react";

export default function SalesPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [lastSaleId, setLastSaleId] = useState(null);

  async function load() {
    const p = await fetch("/api/products").then((r) => r.json());
    setProducts(Array.isArray(p) ? p.filter((x) => x.active) : []);
  }
  async function loadHistory() {
    const h = await fetch("/api/sales").then((r) => r.json());
    setHistory(Array.isArray(h) ? h : []);
  }

  useEffect(() => { load(); }, []);

  function addToCart(p) {
    const existing = cart.find((c) => c.productId === p.id);
    if (existing) {
      setCart(cart.map((c) => (c.productId === p.id ? { ...c, quantity: c.quantity + 1 } : c)));
    } else {
      setCart([...cart, { productId: p.id, name: p.name, quantity: 1, sellPrice: p.sellPrice, maxQty: p.quantity }]);
    }
  }

  function updateQty(productId, qty) {
    setCart(cart.map((c) => (c.productId === productId ? { ...c, quantity: Number(qty) } : c)));
  }

  function removeFromCart(productId) {
    setCart(cart.filter((c) => c.productId !== productId));
  }

  const total = cart.reduce((s, c) => s + c.quantity * c.sellPrice, 0);

  async function checkout() {
    setError(""); setSuccess("");
    if (cart.length === 0) { setError("السلة فارغة"); return; }
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName,
        paidAmount: total,
        items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity, sellPrice: c.sellPrice })),
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "خطأ"); return; }
    setSuccess(`تم البيع بنجاح - فاتورة رقم ${data.id}`);
    setLastSaleId(data.id);
    setCart([]);
    setCustomerName("");
    load();
  }

  const filtered = products.filter(
    (p) => p.name.includes(search) || p.sku.includes(search)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">نقطة البيع (كاشير)</h1>
        <button className="btn-secondary" onClick={() => { setShowHistory(true); loadHistory(); }}>
          سجل المبيعات
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card">
          <input
            className="input mb-3"
            placeholder="ابحث بالاسم أو الكود..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={p.quantity <= 0}
                className={`text-right border rounded-lg p-3 hover:border-brand-500 transition ${p.quantity <= 0 ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <div className="font-semibold text-sm">{p.name}</div>
                <div className="text-xs text-gray-500">{p.sku}</div>
                <div className="text-brand-700 font-bold mt-1">{p.sellPrice}</div>
                <div className="text-xs text-gray-400">متوفر: {p.quantity}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="card space-y-3">
          <div className="font-semibold text-gray-700">السلة</div>
          <input
            className="input"
            placeholder="اسم العميل (اختياري)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {cart.map((c) => (
              <div key={c.productId} className="flex items-center justify-between text-sm border-b pb-2">
                <div className="flex-1">
                  <div>{c.name}</div>
                  <div className="text-gray-400 text-xs">{c.sellPrice} × {c.quantity}</div>
                </div>
                <input
                  type="number"
                  min="1"
                  max={c.maxQty}
                  className="input w-16 text-center"
                  value={c.quantity}
                  onChange={(e) => updateQty(c.productId, e.target.value)}
                />
                <button className="text-red-600 text-xs mr-2" onClick={() => removeFromCart(c.productId)}>حذف</button>
              </div>
            ))}
            {cart.length === 0 && <div className="text-gray-400 text-sm text-center py-4">السلة فارغة</div>}
          </div>

          {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
          {success && (
            <div className="bg-green-50 text-green-700 text-sm rounded-lg px-3 py-2 flex items-center justify-between">
              <span>{success}</span>
              {lastSaleId && (
                <a href={`/invoice/${lastSaleId}`} target="_blank" className="underline font-semibold">
                  عرض الفاتورة
                </a>
              )}
            </div>
          )}

          <div className="text-lg font-bold flex justify-between border-t pt-2">
            <span>الإجمالي</span>
            <span>{total.toFixed(2)}</span>
          </div>
          <button className="btn-primary w-full" onClick={checkout}>إتمام البيع</button>
        </div>
      </div>

      {showHistory && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-3xl space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <div className="font-bold text-lg">سجل المبيعات</div>
              <button className="btn-secondary" onClick={() => setShowHistory(false)}>إغلاق</button>
            </div>
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>التاريخ</th><th>العميل</th><th>الإجمالي</th><th>بواسطة</th><th>الفاتورة</th></tr>
              </thead>
              <tbody>
                {history.map((s) => (
                  <tr key={s.id}>
                    <td>{s.id}</td>
                    <td>{new Date(s.createdAt).toLocaleString("ar-EG")}</td>
                    <td>{s.customerName || "-"}</td>
                    <td className="font-semibold">{s.total.toFixed(2)}</td>
                    <td>{s.user?.name}</td>
                    <td>
                      <a href={`/invoice/${s.id}`} target="_blank" className="text-brand-600 hover:underline text-xs">
                        عرض/طباعة
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
