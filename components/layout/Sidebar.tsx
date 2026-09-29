"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  UserCheck,
  FileSpreadsheet,
  BarChart3,
  Settings,
  ShieldCheck,
  History,
  GraduationCap,
  UploadCloud,
} from "lucide-react";
import { PERMISSIONS } from "@/lib/auth/permissions";

interface SidebarProps {
  userPermissions: string[];
  userRoles: string[];
}

export function Sidebar({
  userPermissions,
  userRoles,
}: SidebarProps) {
  const pathname = usePathname();
  const isSuperAdmin = userRoles.includes("SUPER_ADMIN");

  const hasPerm = (perm: string) => isSuperAdmin || userPermissions.includes(perm);

  const isSettingsActive = [
    "/settings",
    "/users",
    "/roles",
    "/imports",
    "/backups",
    "/audit-logs",
    "/data-cleanup",
    "/quotes",
  ].some((path) => pathname === path || pathname.startsWith(path + "/"));

  const canAccessSettings =
    isSuperAdmin ||
    hasPerm(PERMISSIONS.SCHOOL_SETTINGS_VIEW) ||
    hasPerm(PERMISSIONS.ACADEMIC_YEAR_VIEW) ||
    hasPerm(PERMISSIONS.USER_VIEW) ||
    hasPerm(PERMISSIONS.ROLE_VIEW) ||
    hasPerm(PERMISSIONS.STUDENT_IMPORT) ||
    hasPerm(PERMISSIONS.BACKUP_CREATE) ||
    hasPerm(PERMISSIONS.BACKUP_RESTORE) ||
    hasPerm(PERMISSIONS.AUDIT_VIEW);

  const operationalNavItems = [
    {
      title: "لوحة التحكم",
      href: "/dashboard",
      icon: LayoutDashboard,
      visible: hasPerm(PERMISSIONS.DASHBOARD_VIEW),
    },
    {
      title: "سجل الطلاب",
      href: "/students",
      icon: Users,
      visible: hasPerm(PERMISSIONS.STUDENT_VIEW),
    },
    {
      title: "الأنشطة المدرسية",
      href: "/activities",
      icon: CalendarDays,
      visible: hasPerm(PERMISSIONS.ACTIVITY_VIEW),
    },
    {
      title: "تسجيل المشاركات",
      href: "/participations",
      icon: UserCheck,
      visible: hasPerm(PERMISSIONS.PARTICIPATION_VIEW) || hasPerm(PERMISSIONS.PARTICIPATION_CREATE),
    },
    {
      title: "التقارير الرسمية",
      href: "/reports/stat",
      icon: FileSpreadsheet,
      visible: hasPerm(PERMISSIONS.REPORT_VIEW) || hasPerm(PERMISSIONS.STATISTICS_VIEW),
    },
  ];

  return (
    <aside className="w-64 bg-white border-l border-slate-200/80 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-slate-100 flex items-center gap-3 bg-gradient-to-r from-[#8A1538]/5 to-transparent">
        <div className="w-10 h-10 rounded-xl bg-[#8A1538] flex items-center justify-center text-white shadow-sm shadow-[#8A1538]/30">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-sm text-[#8A1538] leading-tight">الأنشطة الطلابية</span>
          <span className="text-[11px] text-slate-500 font-medium">دولة قطر — التعليم</span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
        {operationalNavItems
          .filter((item) => item.visible)
          .map((item) => {
            const isReportsItem = item.href === "/reports/stat";
            const isActive = isReportsItem
              ? pathname.startsWith("/reports") || pathname.startsWith("/statistics")
              : pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-[#8A1538] text-white shadow-sm shadow-[#8A1538]/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{item.title}</span>
              </Link>
            );
          })}

        {/* Unified Administration & Settings Section */}
        {canAccessSettings && (
          <div className="pt-3 mt-3 border-t border-slate-100 space-y-1">
            <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              إدارة النظام
            </span>
            <Link
              href="/settings"
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                isSettingsActive
                  ? "bg-[#8A1538] text-white shadow-sm shadow-[#8A1538]/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings className={`w-5 h-5 ${isSettingsActive ? "text-white" : "text-slate-400"}`} />
                <span>الإعدادات والنظام</span>
              </div>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                  isSettingsActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                مركز موحد
              </span>
            </Link>
          </div>
        )}
      </nav>


      {/* Footer Info */}
      <div className="p-3 border-t border-slate-100 text-[11px] text-slate-400 text-center">
        <span>الإصدار 2.0 • نظام الويب المعتمد</span>
      </div>
    </aside>
  );
}
