"use client";
import { useEffect, useState } from "react";
import { PERMISSIONS } from "@/lib/permissions";
import { Users, UserPlus } from "lucide-react";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState("");

  function emptyForm() {
    return { name: "", username: "", password: "", role: "CASHIER", permissions: [] };
  }

  async function load() {
    const u = await fetch("/api/users").then((r) => r.json());
    setUsers(Array.isArray(u) ? u : []);
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setShowForm(true);
    setError("");
  }

  function openEdit(u) {
    setEditing(u);
    let perms = [];
    try { perms = JSON.parse(u.permissions || "[]"); } catch {}
    setForm({ name: u.name, username: u.username, password: "", role: u.role, permissions: perms, active: u.active });
    setShowForm(true);
    setError("");
  }

  function togglePerm(key) {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter((p) => p !== key)
        : [...f.permissions, key],
    }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    const res = await fetch(editing ? `/api/users/${editing.id}` : "/api/users", {
      method: editing ? "PATCH" : "POST",
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

  async function toggleActive(u) {
    await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Users className="text-brand-600" size={22} /> المستخدمين والصلاحيات
        </h1>
        <button className="btn-primary flex items-center gap-1" onClick={openNew}><UserPlus size={16} /> مستخدم جديد</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>الدور</th><th>الحالة</th><th>إجراءات</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.username}</td>
                <td>{roleLabel(u.role)}</td>
                <td>{u.active ? <span className="text-green-600">فعال</span> : <span className="text-red-600">موقوف</span>}</td>
                <td className="flex gap-2">
                  <button className="text-brand-600 hover:underline text-xs" onClick={() => openEdit(u)}>تعديل</button>
                  <button className="text-red-600 hover:underline text-xs" onClick={() => toggleActive(u)}>
                    {u.active ? "إيقاف" : "تفعيل"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <form onSubmit={submit} className="card w-full max-w-lg space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="font-bold text-lg">{editing ? "تعديل مستخدم" : "مستخدم جديد"}</div>
            {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
            <div>
              <label className="label">الاسم</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">اسم المستخدم</label>
              <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled={!!editing} required />
            </div>
            <div>
              <label className="label">{editing ? "كلمة مرور جديدة (اتركها فارغة لعدم التغيير)" : "كلمة المرور"}</label>
              <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} />
            </div>
            <div>
              <label className="label">الدور</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="ADMIN">مدير (كل الصلاحيات)</option>
                <option value="MANAGER">مشرف</option>
                <option value="CASHIER">كاشير</option>
                <option value="WAREHOUSE">مخازن</option>
                <option value="CUSTOM">صلاحيات مخصصة</option>
              </select>
            </div>
            {form.role !== "ADMIN" && (
              <div>
                <label className="label">الصلاحيات</label>
                <div className="grid grid-cols-2 gap-2 border rounded-lg p-3">
                  {PERMISSIONS.map((p) => (
                    <label key={p.key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(p.key)}
                        onChange={() => togglePerm(p.key)}
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
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

function roleLabel(role) {
  return { ADMIN: "مدير", MANAGER: "مشرف", CASHIER: "كاشير", WAREHOUSE: "مخازن", CUSTOM: "مخصص" }[role] || role;
}
