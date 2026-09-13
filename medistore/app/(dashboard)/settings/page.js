"use client";
import { useState } from "react";
import { Settings, AlertTriangle, RotateCcw, Trash2 } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
        <Settings className="text-brand-600" size={22} /> الإعدادات
      </h1>

      <ResetTodayCard />
      <ResetAllCard />
    </div>
  );
}

function ResetTodayCard() {
  const [password, setPassword] = useState("");
  const [confirmStep, setConfirmStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function doReset() {
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/admin/reset-today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setResult({ ok: false, message: data.error || "خطأ" }); return; }
    setResult({
      ok: true,
      message: `تم التصفير: ${data.sales} فاتورة بيع، ${data.purchases} فاتورة شراء، ${data.movements} حركة مخزون، ${data.salaries || 0} دفعة راتب، ${data.expenses || 0} مصروف. تم إرجاع الكميات كما كانت قبل اليوم.`,
    });
    setPassword("");
    setConfirmStep(false);
  }

  return (
    <div className="card space-y-4 max-w-lg border-amber-200">
      <div className="flex items-center gap-2 text-amber-600 font-semibold">
        <AlertTriangle size={20} /> تصفير بيانات اليوم فقط
      </div>
      <p className="text-sm text-gray-600">
        يحذف فواتير البيع والشراء وحركات المخزون اللي حصلت <span className="font-bold">اليوم فقط</span>، ويرجّع
        كميات المخزون كما كانت قبل اليوم. مفيد لتنظيف تجربة يوم واحد فقط. لا يؤثر على أيام سابقة.
      </p>
      {result && (
        <div className={`text-sm rounded-lg px-3 py-2 ${result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {result.message}
        </div>
      )}
      {!confirmStep ? (
        <button className="btn-secondary flex items-center gap-2 border-amber-300 text-amber-700" onClick={() => setConfirmStep(true)}>
          <RotateCcw size={16} /> تصفير بيانات اليوم
        </button>
      ) : (
        <div className="space-y-2">
          <label className="label">أدخل كلمة مرورك للتأكيد</label>
          <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => { setConfirmStep(false); setPassword(""); }}>إلغاء</button>
            <button className="btn-danger" onClick={doReset} disabled={loading || !password}>
              {loading ? "جاري التصفير..." : "تأكيد تصفير اليوم"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResetAllCard() {
  const [password, setPassword] = useState("");
  const [confirmWord, setConfirmWord] = useState("");
  const [confirmStep, setConfirmStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function doReset() {
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/admin/reset-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setResult({ ok: false, message: data.error || "خطأ" }); return; }
    setResult({
      ok: true,
      message: `تم التصفير الكامل: ${data.sales} فاتورة بيع، ${data.purchases} فاتورة شراء، ${data.movements} حركة مخزون، ${data.salaries || 0} دفعة راتب، ${data.expenses || 0} مصروف، وتصفير كمية ${data.productsReset} صنف. النظام جاهز للبدء ببيانات حقيقية.`,
    });
    setPassword("");
    setConfirmWord("");
    setConfirmStep(false);
  }

  return (
    <div className="card space-y-4 max-w-lg border-red-300">
      <div className="flex items-center gap-2 text-red-600 font-semibold">
        <Trash2 size={20} /> تصفير النظام بالكامل (نهاية فترة التجربة)
      </div>
      <p className="text-sm text-gray-600">
        يحذف <span className="font-bold">كل</span> فواتير البيع والشراء وحركات المخزون وسجل التعديلات من كل الفترة
        السابقة، ويصفّر كمية كل الأصناف إلى صفر — استخدمه لما تخلص من تجربة السستم وتحب تبدأ الشغل الفعلي ببيانات
        حقيقية. الأصناف والتصنيفات والموردين والمستخدمين وصلاحياتهم <span className="font-bold">تفضل زي ما هي</span> —
        بس تحتاج تسجل مشتريات جديدة لتعبئة المخزون الحقيقي من جديد.
      </p>
      <p className="text-sm text-red-600 font-bold">هذا الإجراء نهائي ولا يمكن التراجع عنه إطلاقاً.</p>

      {result && (
        <div className={`text-sm rounded-lg px-3 py-2 ${result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {result.message}
        </div>
      )}

      {!confirmStep ? (
        <button className="btn-danger flex items-center gap-2" onClick={() => setConfirmStep(true)}>
          <Trash2 size={16} /> تصفير النظام بالكامل
        </button>
      ) : (
        <div className="space-y-2">
          <label className="label">اكتب كلمة "تأكيد" بالضبط للمتابعة</label>
          <input className="input" value={confirmWord} onChange={(e) => setConfirmWord(e.target.value)} placeholder="تأكيد" />
          <label className="label">أدخل كلمة مرورك</label>
          <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => { setConfirmStep(false); setPassword(""); setConfirmWord(""); }}>إلغاء</button>
            <button className="btn-danger" onClick={doReset} disabled={loading || !password || confirmWord !== "تأكيد"}>
              {loading ? "جاري التصفير..." : "تصفير كل شيء نهائياً"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
