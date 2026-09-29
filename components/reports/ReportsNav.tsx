"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  FileSpreadsheet,
  Award,
  UserX,
  CalendarDays,
  BarChart3,
  School,
} from "lucide-react";

export interface ReportsNavProps {
  currentTab?: string;
}

export function ReportsNav({ currentTab }: ReportsNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeParamTab = currentTab || searchParams.get("tab") || "";

  const tabs = [
    {
      id: "stat",
      title: "التقرير الإحصائي الرسمي (stat)",
      href: "/reports/stat",
      tabParam: "stat",
      icon: Award,
      badge: "رسمي معتمد",
    },
    {
      id: "non-participants",
      title: "تقرير الطلاب غير المشاركين",
      href: "/reports/non-participants",
      tabParam: "non-participants",
      icon: UserX,
      badge: "متابعة وتحفيز",
    },
    {
      id: "act",
      title: "تقرير الأنشطة المنفذة (act)",
      href: "/reports/act",
      tabParam: "act",
      icon: CalendarDays,
      badge: "سجل الفعاليات",
    },
    {
      id: "statistics",
      title: "مؤشرات تصنيفات الأنشطة (kind)",
      href: "/statistics",
      tabParam: "statistics",
      icon: BarChart3,
      badge: "مؤشرات قياس",
    },
  ];

  const isTabActive = (tab: typeof tabs[0]) => {
    if (tab.href === "/reports/stat") {
      return pathname === "/reports/stat" || pathname === "/reports";
    }
    if (tab.href === "/reports/non-participants") {
      return pathname === "/reports/non-participants";
    }
    if (tab.href === "/reports/act") {
      return pathname === "/reports/act";
    }
    if (tab.href === "/statistics") {
      return pathname === "/statistics" || pathname.startsWith("/statistics/");
    }

    return false;
  };

  return (
    <div className="space-y-4 print:hidden">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8A1538]/10 text-[#8A1538] border border-[#8A1538]/20 flex items-center justify-center shadow-2xs shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-800 tracking-tight">
                  التقارير المدرسية والإحصائيات
                </h1>
                <span className="text-[10px] font-bold text-[#8A1538] bg-[#8A1538]/10 border border-[#8A1538]/20 px-2 py-0.5 rounded-full">
                  معتمدة ورسمية
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                فهرس التقارير الرسمية والتفصيلية المعتمدة مع إمكانية الطباعة وتصدير ملفات Excel (XLSX)
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation (Segmented Bar) */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {tabs.map((tab) => {
            const active = isTabActive(tab);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 select-none ${
                  active
                    ? "bg-[#8A1538] text-white shadow-xs"
                    : "bg-slate-50/80 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/80"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? "text-white" : "text-slate-500"}`} />
                <span>{tab.title}</span>
                {tab.badge && !active && (
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
