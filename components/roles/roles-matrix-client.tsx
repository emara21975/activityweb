"use client";

import React, { useState, useTransition } from "react";
import { updateRolePermissionsAction } from "@/app/actions/role-actions";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Layers,
  Save,
  CheckSquare,
  Square,
  Sparkles,
} from "lucide-react";

interface RolePermissionItem {
  permission: {
    id: string;
    code: string;
    module: string;
    description: string | null;
  };
}

interface RoleItem {
  id: string;
  code: string;
  name_ar: string;
  description: string | null;
  is_system: boolean;
  permissions: RolePermissionItem[];
}

interface PermissionItem {
  id: string;
  code: string;
  module: string;
  description: string | null;
}

interface RolesMatrixClientProps {
  roles: RoleItem[];
  allPermissions: PermissionItem[];
  canManage: boolean;
}

const MODULE_LABELS: Record<string, string> = {
  dashboard: "لوحة التحكم",
  student: "إدارة الطلاب",
  enrollment: "التسجيلات والصفوف",
  activity: "الأنشطة المدرسية",
  participation: "توثيق المشاركات",
  report: "التقارير المعتمدة",
  statistics: "المؤشرات الإحصائية",
  attachment: "المرفقات والوثائق",
  academic_year: "الأعوام الدراسية",
  category: "تصنيفات الأنشطة",
  school_settings: "إعدادات المدرسة",
  user: "إدارة المستخدمين",
  role: "الأدوار والصلاحيات",
  audit: "سجل التدقيق الأمني",
  backup: "النسخ الاحتياطي والاستعادة",
};

export function RolesMatrixClient({
  roles,
  allPermissions,
  canManage,
}: RolesMatrixClientProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0]?.id || "");
  const [rolePermissionsMap, setRolePermissionsMap] = useState<Record<string, Set<string>>>(() => {
    const map: Record<string, Set<string>> = {};
    for (const r of roles) {
      map[r.id] = new Set(r.permissions.map((p) => p.permission.id));
    }
    return map;
  });

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const currentSelectedPermIds = rolePermissionsMap[selectedRoleId] || new Set<string>();

  // Group permissions by module
  const permissionsByModule = allPermissions.reduce<Record<string, PermissionItem[]>>(
    (acc, perm) => {
      const mod = perm.module || "other";
      if (!acc[mod]) acc[mod] = [];
      acc[mod].push(perm);
      return acc;
    },
    {}
  );

  const togglePermission = (permId: string) => {
    if (!canManage) return;

    setRolePermissionsMap((prev) => {
      const current = new Set(prev[selectedRoleId] || []);
      if (current.has(permId)) {
        current.delete(permId);
      } else {
        current.add(permId);
      }
      return { ...prev, [selectedRoleId]: current };
    });
  };

  const toggleModulePermissions = (modulePerms: PermissionItem[]) => {
    if (!canManage) return;

    setRolePermissionsMap((prev) => {
      const current = new Set(prev[selectedRoleId] || []);
      const allSelected = modulePerms.every((p) => current.has(p.id));

      if (allSelected) {
        // Deselect all in module
        for (const p of modulePerms) current.delete(p.id);
      } else {
        // Select all in module
        for (const p of modulePerms) current.add(p.id);
      }
      return { ...prev, [selectedRoleId]: current };
    });
  };

  const handleSelectAll = () => {
    if (!canManage) return;
    setRolePermissionsMap((prev) => ({
      ...prev,
      [selectedRoleId]: new Set(allPermissions.map((p) => p.id)),
    }));
  };

  const handleDeselectAll = () => {
    if (!canManage) return;
    // Don't allow clearing SUPER_ADMIN
    if (selectedRole?.code === "SUPER_ADMIN") {
      setError("لا يمكن إلغاء جميع صلاحيات مدير النظام.");
      return;
    }
    setRolePermissionsMap((prev) => ({
      ...prev,
      [selectedRoleId]: new Set(),
    }));
  };

  const handleSave = () => {
    if (!selectedRole || !canManage) return;

    setError(null);
    setSuccess(null);

    const permIds = Array.from(rolePermissionsMap[selectedRoleId] || []);

    startTransition(async () => {
      const res = await updateRolePermissionsAction(selectedRoleId, permIds);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(`تم حفظ وتحديث صلاحيات دور "${selectedRole.name_ar}" بنجاح.`);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#8A1538]" />
            <span>مصفوفة الأدوار والصلاحيات (RBAC)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            إدارة وضبط صلاحيات النظام بدقة متناهية لكل دور من الأدوار الـ 5 المعتمدة لضمان أمان البيانات.
          </p>
        </div>

        {canManage && (
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={isPending}
            className="shadow-sm font-bold gap-2 text-xs"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#C59B27]" />
                <span>حفظ تغييرات الدور</span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Roles Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {roles.map((role) => {
          const isSelected = role.id === selectedRoleId;
          const assignedCount = (rolePermissionsMap[role.id] || new Set()).size;

          return (
            <button
              key={role.id}
              type="button"
              onClick={() => {
                setSelectedRoleId(role.id);
                setError(null);
                setSuccess(null);
              }}
              className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-2 ${
                isSelected
                  ? "bg-[#8A1538] text-white border-[#8A1538] shadow-md shadow-[#8A1538]/20"
                  : "bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-xs">{role.name_ar}</span>
                {role.is_system && (
                  <Lock className={`w-3.5 h-3.5 ${isSelected ? "text-[#C59B27]" : "text-slate-400"}`} />
                )}
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className={isSelected ? "text-rose-100" : "text-slate-400"}>
                  {role.code}
                </span>
                <span
                  className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {assignedCount} / {allPermissions.length}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Role Header Info & Quick Bulk Actions */}
      {selectedRole && (
        <Card className="p-4 bg-gradient-to-r from-slate-50 via-white to-slate-50 border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  صلاحيات دور: {selectedRole.name_ar}
                </h2>
                {selectedRole.code === "SUPER_ADMIN" ? (
                  <Badge variant="maroon" className="gap-1 text-[11px]">
                    <Sparkles className="w-3 h-3 text-[#C59B27]" />
                    <span>كامل الصلاحيات</span>
                  </Badge>
                ) : (
                  <Badge variant="neutral" className="text-[11px]">
                    {currentSelectedPermIds.size} صلاحية مفعلة
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500">{selectedRole.description || "لا يوجد وصف إضافي."}</p>
            </div>

            {canManage && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs font-semibold gap-1.5"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>تحديد الكل</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAll}
                  className="text-xs font-semibold gap-1.5"
                >
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>إلغاء التحديد</span>
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Permissions Matrix by Module */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(permissionsByModule).map(([mod, perms]) => {
          const modLabel = MODULE_LABELS[mod] || mod;
          const selectedInModCount = perms.filter((p) => currentSelectedPermIds.has(p.id)).length;
          const allInModSelected = selectedInModCount === perms.length;

          return (
            <Card
              key={mod}
              className="p-0 overflow-hidden border border-slate-200 shadow-xs flex flex-col justify-between"
            >
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#8A1538]" />
                  <span className="font-bold text-xs text-slate-900">{modLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-500">
                    {selectedInModCount} / {perms.length}
                  </span>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => toggleModulePermissions(perms)}
                      className="text-[11px] text-[#8A1538] hover:underline font-semibold"
                    >
                      {allInModSelected ? "إلغاء" : "تحديد"}
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 divide-y divide-slate-100 flex-1">
                {perms.map((p) => {
                  const isChecked = currentSelectedPermIds.has(p.id);

                  return (
                    <label
                      key={p.id}
                      className={`flex items-start gap-3 py-2 px-1.5 rounded-lg cursor-pointer transition-colors ${
                        isChecked ? "bg-amber-50/50" : "hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePermission(p.id)}
                        disabled={!canManage}
                        className="mt-0.5 rounded text-[#8A1538] focus:ring-[#8A1538] h-4 w-4 border-slate-300"
                      />
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold ${
                              isChecked ? "text-slate-900" : "text-slate-600"
                            }`}
                          >
                            {p.description || p.code}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 block truncate">
                          {p.code}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
