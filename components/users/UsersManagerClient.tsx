"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Power, Search, X, Loader2, AlertTriangle, KeyRound } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateUserAction, toggleUserStatusAction, deleteUserAction } from "@/app/actions/user-actions";

export interface ManagedUser {
  id: string;
  username: string;
  display_name: string;
  email: string | null;
  is_active: boolean;
  last_login_at: string | null;
  roles: { id: string; code: string; name_ar: string }[];
}

export interface ManagedRole {
  id: string;
  code: string;
  name_ar: string;
}

interface UsersManagerClientProps {
  users: ManagedUser[];
  roles: ManagedRole[];
  currentUserId: string;
  canUpdate: boolean;
  canToggle: boolean;
  canDelete: boolean;
}

const inputClass =
  "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none";

export function UsersManagerClient({
  users,
  roles,
  currentUserId,
  canUpdate,
  canToggle,
  canDelete,
}: UsersManagerClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [deleting, setDeleting] = useState<ManagedUser | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) =>
        (!q || u.display_name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)) &&
        (!roleFilter || u.roles.some((r) => r.id === roleFilter))
    );
  }, [users, query, roleFilter]);

  const hasActions = canUpdate || canToggle || canDelete;

  const handleToggle = (u: ManagedUser) => {
    setError(null);
    setBusyId(u.id);
    startTransition(async () => {
      const res = await toggleUserStatusAction(u.id, !u.is_active);
      if ("error" in res) setError(res.error);
      setBusyId(null);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!deleting) return;
    const target = deleting;
    setError(null);
    startTransition(async () => {
      const res = await deleteUserAction(target.id);
      if ("error" in res) setError(res.error);
      setDeleting(null);
      router.refresh();
    });
  };

  return (
    <>
      <Card className="p-0 overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle>قائمة المستخدمين</CardTitle>
            <CardDescription>الحسابات المسجلة وحالة النشاط والأدوار</CardDescription>
          </div>
          <Badge variant="neutral">
            {filtered.length === users.length ? `${users.length} مستخدم` : `${filtered.length} من ${users.length}`}
          </Badge>
        </CardHeader>

        <div className="p-3 border-b border-slate-100 flex flex-col sm:flex-row gap-2 text-xs">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث بالاسم أو اسم المستخدم..."
              className={`${inputClass} pr-8`}
            />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={`${inputClass} sm:w-48`}>
            <option value="">كل الأدوار</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name_ar}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mx-3 mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="إغلاق">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">الاسم الظاهر</th>
                <th className="py-3 px-4">اسم المستخدم</th>
                <th className="py-3 px-4">الأدوار الممنوحة</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4">آخر دخول</th>
                {hasActions && <th className="py-3 px-4 text-center">إجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {u.display_name}
                      {isSelf && <span className="text-[10px] text-slate-400 font-medium mr-1">(أنت)</span>}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{u.username}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <Badge key={r.id} variant={r.code === "SUPER_ADMIN" ? "maroon" : "gold"}>
                            {r.name_ar}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={u.is_active ? "success" : "neutral"}>{u.is_active ? "نشط" : "معطل"}</Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleString("ar-QA") : "لم يسجل دخول"}
                    </td>
                    {hasActions && (
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1">
                          {canUpdate && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-slate-600 hover:bg-slate-100"
                              title="تعديل"
                              onClick={() => {
                                setError(null);
                                setEditing(u);
                              }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {canToggle && !isSelf && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`h-7 px-2 ${u.is_active ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}`}
                              title={u.is_active ? "تعطيل الحساب" : "تفعيل الحساب"}
                              disabled={isPending && busyId === u.id}
                              onClick={() => handleToggle(u)}
                            >
                              {isPending && busyId === u.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Power className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          )}
                          {canDelete && !isSelf && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-rose-600 hover:bg-rose-50"
                              title="حذف"
                              onClick={() => {
                                setError(null);
                                setDeleting(u);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={hasActions ? 6 : 5} className="py-10 text-center text-slate-400">
                    لا يوجد مستخدمون مطابقون للبحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && (
        <EditUserDialog
          user={editing}
          roles={roles}
          isSelf={editing.id === currentUserId}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-slate-800">حذف المستخدم نهائياً</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  سيتم حذف حساب <strong>{deleting.display_name}</strong> ({deleting.username}) ولن يتمكن من الدخول
                  مرة أخرى. الأنشطة والمشاركات التي سجّلها ستبقى محفوظة، وتظهر أنشطته «بدون مسؤول» في شاشة توزيع
                  الأنشطة. لا يمكن التراجع عن هذا الإجراء.
                </p>
                <p className="text-[11px] text-slate-500">إذا أردت إيقافه مؤقتاً، استخدم «تعطيل الحساب» بدلاً من الحذف.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="ghost" size="sm" onClick={() => setDeleting(null)} disabled={isPending}>
                إلغاء
              </Button>
              <Button variant="danger" size="sm" onClick={handleDelete} disabled={isPending} className="gap-1.5 font-bold">
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                حذف نهائي
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EditUserDialog({
  user,
  roles,
  isSelf,
  onClose,
  onSaved,
}: {
  user: ManagedUser;
  roles: ManagedRole[];
  isSelf: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    username: user.username,
    display_name: user.display_name,
    email: user.email || "",
    password: "",
    is_active: user.is_active,
    role_ids: user.roles.map((r) => r.id),
  });

  const toggleRole = (id: string) =>
    setForm((f) => ({
      ...f,
      role_ids: f.role_ids.includes(id) ? f.role_ids.filter((r) => r !== id) : [...f.role_ids, id],
    }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateUserAction({ id: user.id, ...form });
      if ("error" in res) setError(res.error);
      else onSaved();
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-black text-lg text-slate-800">تعديل المستخدم: {user.display_name}</h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">اسم المستخدم *</label>
              <input
                type="text"
                required
                dir="ltr"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className={`${inputClass} text-left font-mono`}
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">الاسم الظاهر *</label>
              <input
                type="text"
                required
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                dir="ltr"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={`${inputClass} text-left`}
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5" /> كلمة مرور جديدة
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="اتركها فارغة لعدم التغيير"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-2">الأدوار *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 cursor-pointer text-slate-800 font-bold">
                  <input
                    type="checkbox"
                    checked={form.role_ids.includes(r.id)}
                    onChange={() => toggleRole(r.id)}
                    className="rounded text-[#8A1538]"
                  />
                  {r.name_ar}
                </label>
              ))}
            </div>
          </div>

          <label className={`flex items-center gap-2 font-bold text-slate-700 ${isSelf ? "opacity-50" : "cursor-pointer"}`}>
            <input
              type="checkbox"
              checked={form.is_active}
              disabled={isSelf}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded text-[#8A1538]"
            />
            الحساب نشط ويمكنه تسجيل الدخول
          </label>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-bold">{error}</div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isPending} className="gap-1.5 font-bold">
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              حفظ التعديلات
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
