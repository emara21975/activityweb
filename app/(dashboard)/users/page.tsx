import React from "react";
import { getUsers, getRoles } from "@/lib/services/user-service";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createUserAction } from "@/app/actions/user-actions";
import { ShieldCheck, UserPlus, User, Lock, Mail } from "lucide-react";

import { SettingsNav } from "@/components/settings/SettingsNav";
import { getSession } from "@/lib/auth/session";

export default async function UsersPage() {
  const [session, users, roles] = await Promise.all([
    getSession(),
    getUsers(),
    getRoles(),
  ]);

  return (
    <div className="space-y-6">
      <SettingsNav
        userPermissions={session?.user?.permissions}
        userRoles={session?.user?.roles}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Users List */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-0 overflow-hidden">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle>قائمة المستخدمين</CardTitle>
                <CardDescription>الحسابات المسجلة وحالة النشاط والأدوار</CardDescription>
              </div>
              <Badge variant="neutral">{users.length} مستخدم</Badge>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">الاسم الظاهر</th>
                    <th className="py-3 px-4">اسم المستخدم</th>
                    <th className="py-3 px-4">الأدوار الممنوحة</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4">آخر دخول</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {u.display_name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {u.username}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {u.user_roles.map((ur) => (
                            <Badge
                              key={ur.role.id}
                              variant={ur.role.code === "SUPER_ADMIN" ? "maroon" : "gold"}
                            >
                              {ur.role.name_ar}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={u.is_active ? "success" : "neutral"}>
                          {u.is_active ? "نشط" : "معطل"}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {u.last_login_at
                          ? new Date(u.last_login_at).toLocaleString("ar-QA")
                          : "لم يسجل دخول"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Create User Form */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#8A1538]" />
                <CardTitle>إنشاء مستخدم جديد</CardTitle>
              </div>
              <CardDescription>إضافة حساب وتعيين الصلاحيات</CardDescription>
            </CardHeader>

            <form action={createUserAction} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  اسم المستخدم (تسجيل الدخول) *
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    name="username"
                    required
                    placeholder="مثال: supervisor1"
                    className="w-full pr-8 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  الاسم الظاهر *
                </label>
                <input
                  type="text"
                  name="display_name"
                  required
                  placeholder="مثال: أ. أحمد الكواري"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  البريد الإلكتروني (اختياري)
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    placeholder="user@school.edu.qa"
                    dir="ltr"
                    className="w-full pr-8 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none text-left"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  كلمة المرور الأولية *
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    name="password"
                    required
                    placeholder="••••••••"
                    className="w-full pr-8 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-2">
                  الأدوار والصلاحيات الممنوحة *
                </label>
                <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  {roles.map((r) => (
                    <label
                      key={r.id}
                      className="flex items-start gap-2 cursor-pointer text-slate-800"
                    >
                      <input
                        type="checkbox"
                        name="role_ids"
                        value={r.id}
                        className="rounded text-[#8A1538] mt-0.5"
                      />
                      <div>
                        <span className="font-bold block leading-tight">{r.name_ar}</span>
                        {r.description && (
                          <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                            {r.description}
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" variant="primary" size="md" className="w-full font-bold">
                  إنشاء الحساب وتفعيل الصلاحيات
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
