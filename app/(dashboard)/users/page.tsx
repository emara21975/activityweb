import React from "react";
import { getUsers, getRoles } from "@/lib/services/user-service";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createUserAction } from "@/app/actions/user-actions";
import { UserPlus, User, Lock, Mail } from "lucide-react";

import { SettingsNav } from "@/components/settings/SettingsNav";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { PERMISSIONS, type PermissionCode } from "@/lib/auth/permissions";
import { UsersManagerClient } from "@/components/users/UsersManagerClient";

export default async function UsersPage() {
  const [session, users, roles] = await Promise.all([
    getSession(),
    getUsers(),
    getRoles(),
  ]);

  const can = (code: PermissionCode) =>
    hasPermission(session?.user?.permissions ?? [], code, session?.user?.roles ?? []);

  const managedUsers = users.map((u) => ({
    id: u.id,
    username: u.username,
    display_name: u.display_name,
    email: u.email,
    is_active: u.is_active,
    last_login_at: u.last_login_at ? u.last_login_at.toISOString() : null,
    roles: u.user_roles.map((ur) => ({ id: ur.role.id, code: ur.role.code, name_ar: ur.role.name_ar })),
  }));

  return (
    <div className="space-y-6">
      <SettingsNav
        userPermissions={session?.user?.permissions}
        userRoles={session?.user?.roles}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Users List */}
        <div className="lg:col-span-2 space-y-4">
          <UsersManagerClient
            users={managedUsers}
            roles={roles.map((r) => ({ id: r.id, code: r.code, name_ar: r.name_ar }))}
            currentUserId={session?.user?.id ?? ""}
            canUpdate={can(PERMISSIONS.USER_UPDATE)}
            canToggle={can(PERMISSIONS.USER_DEACTIVATE)}
            canDelete={can(PERMISSIONS.USER_DELETE)}
          />
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
