"use client";

import React from "react";
import { Printer, FileSpreadsheet, ArrowRight, Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrintActionBarProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  excelUrl?: string;
}

export function PrintActionBar({
  title,
  subtitle,
  backHref,
  excelUrl,
}: PrintActionBarProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="print:hidden space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs text-slate-400 font-bold block">{title}</span>
          {subtitle && (
            <span className="text-sm font-black text-slate-800">{subtitle}</span>
          )}
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {backHref && (
            <a href={backHref}>
              <Button variant="ghost" size="sm" className="gap-1.5 text-slate-600 hover:text-slate-900 text-xs font-semibold">
                <ArrowRight className="w-3.5 h-3.5" />
                <span>رجوع</span>
              </Button>
            </a>
          )}

          <Button
            onClick={handlePrint}
            variant="primary"
            size="sm"
            className="gap-1.5 font-bold shadow-xs bg-[#8A1538] hover:bg-[#72112E] text-white"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة المستند (HTML / PDF)</span>
          </Button>

          {excelUrl && (
            <a href={excelUrl} download>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 font-bold text-slate-700 hover:bg-slate-50 border-slate-200"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>تصدير إكسل (XLSX)</span>
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Helpful Print / PDF Guide Pill */}
      <div className="bg-amber-50/80 border border-amber-200/70 rounded-xl px-3.5 py-2 text-xs text-amber-900 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong className="font-bold">لحفظ المستند كملف PDF عالي الجودة:</strong> اضغط زر <strong>«طباعة المستند»</strong> ثم اختر <strong>«حفظ بتنسيق PDF» (Save as PDF)</strong> من خيارات الطابعة في متصفحك.
          </span>
        </div>
        <span className="text-[10px] text-amber-700/80 font-mono hidden md:inline">
          A4 • محاذاة تلقائية • خط عربي أصيل 100%
        </span>
      </div>
    </div>
  );
}
