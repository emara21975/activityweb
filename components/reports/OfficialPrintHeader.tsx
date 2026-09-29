import React from "react";
import { Badge } from "@/components/ui/badge";

interface OfficialPrintHeaderProps {
  schoolName: string;
  reportTitle: string;
  academicYearName: string;
  subtitle?: string;
  generatedAt?: string;
}

export function OfficialPrintHeader({
  schoolName,
  reportTitle,
  academicYearName,
  subtitle = "قسم الأنشطة والبرامج الطلابية المدرسية",
  generatedAt,
}: OfficialPrintHeaderProps) {
  const printDate = generatedAt || new Date().toLocaleString("ar-QA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="border-b-2 border-[#8A1538] pb-5 mb-6">
      <div className="flex items-start justify-between gap-4">
        {/* Ministry & School Details (Right) */}
        <div className="space-y-1 text-right">
          <p className="text-[11px] font-bold text-slate-500">
            دولة قطر — وزارة التربية والتعليم والتعليم العالي
          </p>
          <h2 className="text-xl font-black text-[#8A1538] tracking-tight">
            {schoolName}
          </h2>
          <p className="text-xs text-slate-700 font-semibold">{subtitle}</p>
        </div>

        {/* Center Official Emblem / Badge */}
        <div className="hidden sm:flex flex-col items-center justify-center pt-1 text-center">
          <div className="w-12 h-12 rounded-full border-2 border-[#8A1538]/30 bg-amber-50/50 flex items-center justify-center font-black text-[#8A1538] text-sm shadow-2xs">
            قطر
          </div>
          <span className="text-[10px] text-slate-400 font-bold mt-1">نظام إدارة الأنشطة</span>
        </div>

        {/* Report Info & Date (Left) */}
        <div className="space-y-1.5 text-left" dir="ltr">
          <div className="inline-block bg-[#8A1538] text-white px-3 py-0.5 rounded-md font-bold text-xs">
            {reportTitle}
          </div>
          <p className="text-xs font-bold text-slate-700">
            العام الدراسي: {academicYearName}
          </p>
          <p className="text-[11px] text-slate-400 font-mono">
            تاريخ الطباعة: {printDate}
          </p>
        </div>
      </div>
    </div>
  );
}
