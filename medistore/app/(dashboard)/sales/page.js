"use client";
import { useEffect, useState } from "react";
import { ShoppingCart, History, Trash2, ReceiptText, Undo2, Tag } from "lucide-react";

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
  const [me, setMe] = useState(null);
  const [modalProduct, setModalProduct] = useState(null);
  const [modalQty, setModalQty] = useState(1);
  const [modalPrice, setModalPrice] = useState(0);
  const [detailSale, setDetailSale] = useState(null); // full sale being viewed/returned from history
  const [returnQtys, setReturnQtys] = useState({});

  async function load() {
    const [p, m] = await Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]);
    setProducts(Array.isArray(p) ? p.filter((x) => x.active) : []);
    setMe(m.user);
  }
  async function loadHistory() {
    const h = await fetch("/api/sales").then((r) => r.json());
    setHistory(Array.isArray(h) ? h : []);
  }

  useEffect(() => { load(); }, []);

  const canEditPrice = me?.permissions?.includes("*") || me?.permissions?.includes("sales.edit_price");
  const canReturn = me?.permissions?.includes("*") || me?.permissions?.includes("sales.return");

  function openProductModal(p) {
    const existing = cart.find((c) => c.productId === p.id);
    setModalProduct(p);
    setModalQty(existing ? existing.quantity : 1);
    setModalPrice(existing ? existing.sellPrice : p.sellPrice);
  }

  function confirmModal() {
    const p = modalProduct;
    const qty = Math.max(1, Number(modalQty) || 1);
    const price = Number(modalPrice);
    const existing = cart.find((c) => c.productId === p.id);
    if (existing) {
      setCart(cart.map((c) => (c.productId === p.id ? { ...c, quantity: qty, sellPrice: price } : c)));
    } else {
      setCart([...cart, { productId: p.id, name: p.name, quantity: qty, sellPrice: price, originalPrice: p.sellPrice, maxQty: p.quantity }]);
    }
    setModalProduct(null);
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

  async function openDetails(saleSummary) {
    const res = await fetch(`/api/sales/${saleSummary.id}`);
    const data = await res.json();
    setDetailSale(data);
    setReturnQtys({});
  }

  async function returnItem(item) {
    const remaining = item.quantity - item.returnedQty;
    const qty = Number(returnQtys[item.id] || remaining);
    if (!qty || qty <= 0 || qty > remaining) { alert(`الكمية غير صحيحة. المتاح للإرجاع: ${remaining}`); return; }
    const reason = prompt("سبب الإرجاع (اختياري):") || "";
    const res = await fetch(`/api/sales/${detailSale.id}/items/${item.id}/return`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: qty, reason }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || "خطأ"); return; }
    openDetails(detailSale);
    loadHistory();
    load();
  }

  async function returnWholeSale() {
    if (!confirm(`تأكيد إرجاع كل ما تبقى من فاتورة رقم ${detailSale.id}؟`)) return;
    const reason = prompt("سبب الإرجاع (اختياري):") || "";
    const res = await fetch(`/api/sales/${detailSale.id}/return`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || "خطأ"); return; }
    setDetailSale(null);
    loadHistory();
    load();
  }

  const filtered = products.filter(
    (p) => p.name.includes(search) || p.sku.includes(search)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <ShoppingCart className="text-brand-600" size={22} /> نقطة البيع (كاشير)
        </h1>
        <button className="btn-secondary flex items-center gap-1" onClick={() => { setShowHistory(true); loadHistory(); }}>
          <History size={16} /> سجل المبيعات
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
            {filtered.map((p) => {
              const inCart = cart.find((c) => c.productId === p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => openProductModal(p)}
                  disabled={p.quantity <= 0}
                  className={`relative text-right border rounded-lg p-3 hover:border-brand-500 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 ${p.quantity <= 0 ? "opacity-40 cursor-not-allowed" : ""} ${inCart ? "border-brand-500 bg-brand-50" : ""}`}
                >
                  {inCart && (
                    <span className="absolute -top-2 -left-2 bg-brand-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {inCart.quantity}
                    </span>
                  )}
                  <div className="font-semibold text-sm">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.sku}</div>
                  <div className="text-brand-700 font-bold mt-1">
                    {inCart ? inCart.sellPrice : p.sellPrice}
                  </div>
                  <div className="text-xs text-gray-400">متوفر: {p.quantity}</div>
                </button>
              );
            })}
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
              <div key={c.productId} className="flex items-center justify-between text-sm border-b pb-2 gap-2">
                <button
                  onClick={() => openProductModal({ id: c.productId, name: c.name, sellPrice: c.originalPrice, quantity: c.maxQty })}
                  className="flex-1 min-w-0 text-right hover:bg-gray-50 rounded p-1"
                >
                  <div className="truncate">{c.name}</div>
                  <div className="text-gray-400 text-xs flex items-center gap-1">
                    {c.sellPrice} × {c.quantity}
                    {c.sellPrice !== c.originalPrice && <span className="line-through">{c.originalPrice}</span>}
                    {canEditPrice && <Tag size={11} className="text-brand-500" />}
                  </div>
                </button>
                <button className="text-red-600 p-1" onClick={() => removeFromCart(c.productId)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {cart.length === 0 && <div className="text-gray-400 text-sm text-center py-4">السلة فارغة — اضغط على أي منتج للإضافة</div>}
          </div>

          {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
          {success && (
            <div className="bg-green-50 text-green-700 text-sm rounded-lg px-3 py-2 flex items-center justify-between">
              <span>{success}</span>
              {lastSaleId && (
                <a href={`/invoice/${lastSaleId}`} target="_blank" className="underline font-semibold flex items-center gap-1">
                  <ReceiptText size={16} /> عرض الفاتورة
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

      {/* Quantity + price popup, opened by clicking a product or a cart line */}
      {modalProduct && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setModalProduct(null)}>
          <div className="card w-full max-w-xs space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="font-bold text-base">{modalProduct.name}</div>
            <div>
              <label className="label">الكمية</label>
              <input
                type="number"
                min="1"
                max={modalProduct.quantity}
                className="input"
                value={modalQty}
                onChange={(e) => setModalQty(e.target.value)}
                autoFocus
              />
            </div>
            <div className={`rounded-lg p-3 ${canEditPrice ? "bg-brand-50 border border-brand-200" : "bg-gray-50"}`}>
              <label className="label flex items-center gap-1">
                <Tag size={14} className={canEditPrice ? "text-brand-600" : "text-gray-400"} />
                {canEditPrice ? "السعر (اضغط لتغييره حسب التفاوض)" : "السعر"}
              </label>
              <input
                type="number"
                step="0.01"
                className={`input text-lg font-bold ${canEditPrice ? "border-brand-400" : "bg-gray-100 text-gray-500"}`}
                value={modalPrice}
                onChange={(e) => setModalPrice(e.target.value)}
                disabled={!canEditPrice}
              />
              {!canEditPrice && (
                <div className="text-xs text-gray-400 mt-1">ما عندك صلاحية تعديل السعر — اسأل المدير لو محتاج تفاوض على السعر.</div>
              )}
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" className="btn-secondary" onClick={() => setModalProduct(null)}>إلغاء</button>
              <button type="button" className="btn-primary" onClick={confirmModal}>إضافة للسلة</button>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-3xl space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <div className="font-bold text-lg">سجل المبيعات</div>
              <button className="btn-secondary" onClick={() => setShowHistory(false)}>إغلاق</button>
            </div>
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>التاريخ</th><th>العميل</th><th>الإجمالي</th><th>بواسطة</th><th>تفاصيل</th></tr>
              </thead>
              <tbody>
                {history.map((s) => (
                  <tr key={s.id} className={s.returned ? "opacity-50" : ""}>
                    <td>{s.id}</td>
                    <td>{new Date(s.createdAt).toLocaleString("ar-EG")}</td>
                    <td>{s.customerName || "-"}</td>
                    <td className={`font-semibold ${s.returned ? "line-through" : ""}`}>{s.total.toFixed(2)}</td>
                    <td>{s.user?.name}</td>
                    <td className="flex items-center gap-2">
                      <a href={`/invoice/${s.id}`} target="_blank" className="text-brand-600 hover:underline text-xs">فاتورة</a>
                      <button className="text-gray-600 hover:underline text-xs" onClick={() => openDetails(s)}>تفاصيل{canReturn ? " / إرجاع" : ""}</button>
                      {s.returned && <span className="text-xs text-red-600 font-semibold">مرتجع</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sale detail + per-item return modal */}
      {detailSale && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <div className="font-bold text-lg">فاتورة رقم {detailSale.id}</div>
              <button className="btn-secondary" onClick={() => setDetailSale(null)}>إغلاق</button>
            </div>
            <div className="text-sm text-gray-500">{detailSale.customerName || "بدون اسم عميل"} — {new Date(detailSale.createdAt).toLocaleString("ar-EG")}</div>

            <div className="space-y-2">
              {detailSale.items.map((it) => {
                const remaining = it.quantity - it.returnedQty;
                return (
                  <div key={it.id} className="border rounded-lg p-3 flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{it.product?.name}</div>
                      <div className="text-xs text-gray-500">
                        الكمية: {it.quantity} × {it.sellPrice.toFixed(2)}
                        {it.returnedQty > 0 && <span className="text-red-600"> — مرتجع: {it.returnedQty}</span>}
                      </div>
                    </div>
                    {canReturn && remaining > 0 ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          max={remaining}
                          className="input w-16 text-center py-1"
                          value={returnQtys[it.id] ?? remaining}
                          onChange={(e) => setReturnQtys({ ...returnQtys, [it.id]: e.target.value })}
                        />
                        <button className="btn-secondary flex items-center gap-1 py-1 px-2" onClick={() => returnItem(it)}>
                          <Undo2 size={14} /> إرجاع
                        </button>
                      </div>
                    ) : remaining === 0 ? (
                      <span className="text-xs text-red-600 font-semibold">تم إرجاعه بالكامل</span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center border-t pt-3">
              <div className="font-bold text-lg">الإجمالي الحالي: {detailSale.total.toFixed(2)}</div>
              {canReturn && !detailSale.returned && (
                <button className="btn-danger flex items-center gap-1" onClick={returnWholeSale}>
                  <Undo2 size={14} /> إرجاع كل المتبقي
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
