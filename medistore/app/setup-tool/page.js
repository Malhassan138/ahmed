"use client";
import { useState } from "react";

export default function SetupToolPage() {
  const [secret, setSecret] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState(null); // { ok: bool, message: string }
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, name, username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResult({ ok: true, message: `تم إنشاء الحساب بنجاح. سجل دخول الآن باسم المستخدم "${username}" وكلمة المرور اللي اخترتها.` });
      } else {
        setResult({ ok: false, message: data.error || `خطأ (${res.status})` });
      }
    } catch (err) {
      setResult({ ok: false, message: "تعذر الاتصال بالسستم: " + err.message });
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 shadow-xl">
        <div className="text-center mb-2">
          <div className="text-xl font-extrabold text-brand-700">إنشاء حساب المدير الأول</div>
          <div className="text-xs text-gray-500 mt-1">استخدم هذه الصفحة مرة واحدة فقط بعد أول نشر</div>
        </div>

        {result && (
          <div className={`text-sm rounded-lg px-3 py-2 ${result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {result.message}
          </div>
        )}

        <div>
          <label className="label">SETUP_SECRET (من إعدادات Vercel)</label>
          <input className="input" value={secret} onChange={(e) => setSecret(e.target.value)} required />
        </div>
        <div>
          <label className="label">اسمك</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label">اسم المستخدم</label>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div>
          <label className="label">كلمة المرور</label>
          <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "جاري الإنشاء..." : "إنشاء الحساب"}
        </button>
      </form>
    </div>
  );
}
