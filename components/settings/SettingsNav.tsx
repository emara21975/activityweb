"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  School,
  Users,
  ShieldCheck,
  UploadCloud,
  HardDrive,
  History,
  Settings,
  Trash2,
  Sparkles,
} from "lucide-react";

export interface SettingsNavProps {
  userPermissions?: string[];
  userRoles?: string[];
}

export function SettingsNav({ userPermissions = [], userRoles = [] }: SettingsNavProps) {
  const pathname = usePathname();
  const isSuperAdmin = userRoles.includes("SUPER_ADMIN");

  const hasPerm = (perm: string) => isSuperAdmin || userPermissions.includes(perm);

  const tabs = [
    {
      id: "general",
      title: "بيانات المدرسة والسنوات",
      href: "/settings",
      icon: School,
      visible: true, // Baseline settings
      badge: "الأساسية",
    },
    {
      id: "users",
      title: "إدارة المستخدمين",
      href: "/users",
      icon: Users,
      visible: isSuperAdmin || hasPerm("user:view"),
    },
    {
      id: "roles",
      title: "الأدوار والصلاحيات",
      href: "/roles",
      icon: ShieldCheck,
      visible: isSuperAdmin || hasPerm("role:view"),
    },
    {
      id: "imports",
      title: "استيراد البيانات",
      href: "/imports",
      icon: UploadCloud,
      visible: isSuperAdmin || hasPerm("student:import"),
    },
    {
      id: "backups",
      title: "النسخ الاحتياطي والأمان",
      href: "/backups",
      icon: HardDrive,
      visible: isSuperAdmin || hasPerm("backup:create") || hasPerm("backup:restore"),
    },
    {
      id: "audit-logs",
      title: "سجل العمليات والتدقيق",
      href: "/audit-logs",
      icon: History,
      visible: isSuperAdmin || hasPerm("audit:view"),
    },
    {
      id: "cleanup",
      title: "تفريغ وحذف البيانات",
      href: "/data-cleanup",
      icon: Trash2,
      visible: isSuperAdmin || hasPerm("backup:restore") || hasPerm("school_settings:manage"),
      badge: "إجراء حرج",
    },
    {
      id: "quotes",
      title: "العبارات والبانر التحفيزي",
      href: "/quotes",
      icon: Sparkles,
      visible: isSuperAdmin || hasPerm("school_settings:manage") || hasPerm("school_settings:view"),
      badge: "الهوية",
    },
  ];

  const visibleTabs = tabs.filter((t) => t.visible);

  return (
    <div className="space-y-4 print:hidden">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8A1538]/10 text-[#8A1538] border border-[#8A1538]/20 flex items-center justify-center shadow-2xs shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-800 tracking-tight">
                  مركز الإعدادات وإدارة النظام
                </h1>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                  إدارة شاملة
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                التحكم بالهوية المؤسسية، المستخدمين، الصلاحيات، استيراد السجلات، والنسخ الاحتياطي والتدقيق
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation (Segmented Bar) */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {visibleTabs.map((tab) => {
            const isActive =
              tab.href === "/settings"
                ? pathname === "/settings"
                : pathname === tab.href || pathname.startsWith(tab.href + "/");

            const Icon = tab.icon;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 select-none ${
                  isActive
                    ? "bg-[#8A1538] text-white shadow-xs"
                    : "bg-slate-50/80 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/80"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-slate-500"}`} />
                <span>{tab.title}</span>
                {tab.badge && !isActive && (
                  <span className="text-[10px] text-slate-400 font-normal mr-0.5 hidden md:inline">
                    {tab.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
