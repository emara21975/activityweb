"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OfficialReportData, OfficialIndicatorRow } from "@/lib/services/report-service";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Printer,
  FileSpreadsheet,
  School,
  Calendar,
  AlertTriangle,
  X,
  UserCheck,
  RotateCcw,
  RefreshCw,
  ChevronDown,
  Clock,
  Filter,
} from "lucide-react";

import { PrintActionBar } from "./PrintActionBar";
import { OfficialPrintHeader } from "./OfficialPrintHeader";
import { OfficialPrintFooter } from "./OfficialPrintFooter";

interface OfficialReportViewerProps {
  data: OfficialReportData;
  yearId?: string;
  academicYears?: Array<{ id: string; name: string; is_current: boolean }>;
  selectedYearId?: string;
  filters?: {
    period?: string;
    month?: string;
    date?: string;
    from?: string;
    to?: string;
    yearId?: string;
  };
}

export function OfficialReportViewer({
  data,
  yearId,
  academicYears = [],
  selectedYearId,
  filters,
}: OfficialReportViewerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    title: string;
    categoryName?: string;
    count: number;
  } | null>(null);

  const selectedPeriod = filters?.period || searchParams.get("period") || "";
  const selectedMonth = filters?.month || searchParams.get("month") || "";
  const selectedDate = filters?.date || searchParams.get("date") || "";
  const selectedFrom = filters?.from || searchParams.get("from") || "";
  const selectedTo = filters?.to || searchParams.get("to") || "";
  const currentYearId = filters?.yearId || selectedYearId || yearId || searchParams.get("yearId") || "";

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleResetFilters = () => {
    router.push("/reports/stat");
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/reports/stat?${params.toString()}`);
  };

  const handlePeriodChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set("period", val);
    } else {
      params.delete("period");
    }

    const todayStr = new Date().toISOString().split("T")[0];

    if (val === "single_date") {
      if (!params.get("date")) params.set("date", todayStr);
      params.delete("from");
      params.delete("to");
      params.delete("month");
    } else if (val === "custom") {
      if (!params.get("from")) params.set("from", todayStr);
      if (!params.get("to")) params.set("to", todayStr);
      params.delete("date");
      params.delete("month");
    } else if (val === "specific_month") {
      if (!params.get("month")) {
        const curMonth = (new Date().getMonth() + 1).toString();
        params.set("month", curMonth);
      }
      params.delete("date");
      params.delete("from");
      params.delete("to");
    } else {
      params.delete("date");
      params.delete("from");
      params.delete("to");
      params.delete("month");
    }

    router.push(`/reports/stat?${params.toString()}`);
  };

  // Build dynamic Excel export URL with all current filters
  const excelParams = new URLSearchParams(searchParams.toString());
  excelParams.set("type", "stat");
  if (currentYearId) excelParams.set("yearId", currentYearId);
  const excelExportUrl = `/api/reports/export/excel?${excelParams.toString()}`;

  const periodSubtitle = data.periodLabel ? ` • الفترة: ${data.periodLabel}` : "";

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <PrintActionBar
        title="التقرير الإحصائي الرسمي (stat)"
        subtitle={`${data.schoolName} — العام الدراسي: ${data.academicYearName}${periodSubtitle}`}
        backHref="/reports"
        excelUrl={excelExportUrl}
      />

      {/* 🌟 Dynamic Dashboard-Style Filter Bar (Screen Only) */}
      <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-xs print:hidden">
        {/* Reset & Refresh Buttons (Left) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg font-semibold transition-colors shadow-2xs hover:bg-slate-50 cursor-pointer"
            title="إعادة ضبط كافة الفلاتر"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>إعادة ضبط</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="تحديث البيانات فورياً"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </button>

          {data.periodLabel && data.periodLabel !== "طوال العام الدراسي" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#8A1538]/10 text-[#8A1538] font-bold text-xs border border-[#8A1538]/20">
              <Clock className="w-3 h-3" />
              <span>{data.periodLabel}</span>
            </span>
          )}
        </div>

        {/* Filter Controls (Right) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Academic Year Selector (if multiple available) */}
          {academicYears.length > 0 && (
            <div className="relative">
              <select
                value={currentYearId}
                onChange={(e) => handleFilterChange("yearId", e.target.value)}
                className="appearance-none bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold rounded-lg px-3 py-1.5 pl-7 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-[#8A1538] shadow-2xs"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.is_current ? "(العام الحالي)" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* Conditional Month Selector */}
          {selectedPeriod === "specific_month" && (
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => handleFilterChange("month", e.target.value)}
                className="appearance-none bg-white border border-amber-300 text-slate-800 text-xs font-bold rounded-lg px-3 py-1.5 pl-7 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-[#8A1538] shadow-2xs"
              >
                <option value="">-- اختر الشهر --</option>
                <optgroup label="الفصل الدراسي الأول">
                  <option value="9">شهر سبتمبر (9)</option>
                  <option value="10">شهر أكتوبر (10)</option>
                  <option value="11">شهر نوفمبر (11)</option>
                  <option value="12">شهر ديسمبر (12)</option>
                  <option value="1">شهر يناير (1)</option>
                </optgroup>
                <optgroup label="الفصل الدراسي الثاني">
                  <option value="2">شهر فبراير (2)</option>
                  <option value="3">شهر مارس (3)</option>
                  <option value="4">شهر أبريل (4)</option>
                  <option value="5">شهر مايو (5)</option>
                  <option value="6">شهر يونيو (6)</option>
                </optgroup>
                <optgroup label="شهور الصيف">
                  <option value="7">شهر يوليو (7)</option>
                  <option value="8">شهر أغسطس (8)</option>
                </optgroup>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* Conditional Single Date Picker */}
          {selectedPeriod === "single_date" && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs shadow-2xs">
              <span className="text-slate-500 font-medium">يوم:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleFilterChange("date", e.target.value)}
                className="border-none focus:outline-hidden text-xs text-slate-800 font-mono bg-transparent"
              />
            </div>
          )}

          {/* Conditional Custom Date Range Pickers (من - إلى) */}
          {selectedPeriod === "custom" && (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs shadow-2xs">
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-medium">من:</span>
                <input
                  type="date"
                  value={selectedFrom}
                  onChange={(e) => handleFilterChange("from", e.target.value)}
                  className="border-none focus:outline-hidden text-xs text-slate-800 font-mono bg-transparent"
                />
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-medium">إلى:</span>
                <input
                  type="date"
                  value={selectedTo}
                  onChange={(e) => handleFilterChange("to", e.target.value)}
                  className="border-none focus:outline-hidden text-xs text-slate-800 font-mono bg-transparent"
                />
              </div>
            </div>
          )}

          {/* Period Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="appearance-none bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold rounded-lg px-3 py-1.5 pl-7 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-[#8A1538] shadow-2xs"
            >
              <option value="">الفترة: طوال العام الدراسي</option>
              <option value="today">الفترة: اليوم</option>
              <option value="week">الفترة: هذا الأسبوع</option>
              <option value="month">الفترة: هذا الشهر (الشهر الحالي)</option>
              <option value="term1">الفترة: الفصل الدراسي الأول</option>
              <option value="term2">الفترة: الفصل الدراسي الثاني</option>
              <option value="specific_month">الفترة: شهر معين (اختر من القائمة)...</option>

              <optgroup label="اختيار مباشر للشهر">
                <option value="month_9">شهر سبتمبر (9)</option>
                <option value="month_10">شهر أكتوبر (10)</option>
                <option value="month_11">شهر نوفمبر (11)</option>
                <option value="month_12">شهر ديسمبر (12)</option>
                <option value="month_1">شهر يناير (1)</option>
                <option value="month_2">شهر فبراير (2)</option>
                <option value="month_3">شهر مارس (3)</option>
                <option value="month_4">شهر أبريل (4)</option>
                <option value="month_5">شهر مايو (5)</option>
                <option value="month_6">شهر يونيو (6)</option>
                <option value="month_7">شهر يوليو (7)</option>
                <option value="month_8">شهر أغسطس (8)</option>
              </optgroup>

              <option value="single_date">الفترة: يوم محدد (تاريخ مخصص)...</option>
              <option value="custom">الفترة: فترة مخصصة (من - إلى)...</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Missing Nationality Warning */}
      {data.unknownNationalityCount > 0 && (
        <div className="print:hidden p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>
            تنبيه: يوجد عدد ({data.unknownNationalityCount}) طالب ببيانات جنسية غير محددة قيد المراجعة. يُرجى مراجعة ملفاتهم لضمان دقة المؤشرات الرسمية.
          </span>
        </div>
      )}

      {/* Official Report Document Container */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs print:p-0 print:border-none print:shadow-none space-y-6">
        {/* Printable Official Header */}
        <OfficialPrintHeader
          schoolName={data.schoolName}
          reportTitle="التقرير الإحصائي الرسمي"
          academicYearName={data.academicYearName}
          subtitle={`الفترة المعتمدة: ${data.periodLabel || "طوال العام الدراسي"}`}
          generatedAt={data.generatedAt}
        />

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[11px] font-bold text-slate-500 block">إجمالي طلاب المدرسة</span>
            <span className="text-xl font-black text-slate-800">{data.totalPopulation}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[11px] font-bold text-slate-500 block">المشاركون الفريدون</span>
            <span className="text-xl font-black text-emerald-700">{data.uniqueParticipants}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[11px] font-bold text-slate-500 block">إجمالي المشاركات</span>
            <span className="text-xl font-black text-slate-800">{data.totalParticipations}</span>
          </div>

          <div className="p-3 bg-[#8A1538]/5 rounded-xl border border-[#8A1538]/20 text-center">
            <span className="text-[11px] font-bold text-[#8A1538] block">نسبة المشاركة المعتمدة</span>
            <span className="text-xl font-black text-[#8A1538]">{data.overallParticipationRate}%</span>
          </div>
        </div>

        {/* Detailed Indicators Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border border-slate-200">
            <thead className="bg-[#8A1538] text-white font-bold">
              <tr>
                <th className="py-3 px-3 w-10 text-center border-l border-white/20">م</th>
                <th className="py-3 px-4 border-l border-white/20">تصنيف النشاط المدرسي</th>
                <th className="py-3 px-3 text-center border-l border-white/20">عدد الأنشطة</th>
                <th className="py-3 px-3 text-center border-l border-white/20">قطري</th>
                <th className="py-3 px-3 text-center border-l border-white/20">غير قطري</th>
                <th className="py-3 px-3 text-center border-l border-white/20">إجمالي المشاركات</th>
                <th className="py-3 px-3 text-center border-l border-white/20">الطلاب الفريدون</th>
                <th className="py-3 px-3 text-center border-l border-white/20">نسبة التفعيل من الطلاب</th>
                <th className="py-3 px-3 text-center border-l border-white/20">% القطريين</th>
                <th className="py-3 px-3 text-center">% غير القطريين</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 font-medium">
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    لا توجد بيانات متاحة في هذا العام الأكاديمي والفترة المحددة.
                  </td>
                </tr>
              ) : (
                data.rows.map((row, idx) => (
                  <tr
                    key={row.categoryId}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-3 text-center font-mono text-slate-400 border-l border-slate-200">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 border-l border-slate-200">
                      {row.categoryName}
                    </td>
                    <td className="py-3 px-3 text-center font-mono border-l border-slate-200">
                      {row.activitiesCount}
                    </td>
                    <td
                      onClick={() =>
                        row.qatariParticipations > 0 &&
                        setSelectedCell({
                          title: "المشاركات القطرية",
                          categoryName: row.categoryName,
                          count: row.qatariParticipations,
                        })
                      }
                      className={`py-3 px-3 text-center font-mono border-l border-slate-200 ${
                        row.qatariParticipations > 0
                          ? "cursor-pointer hover:bg-slate-100 font-bold text-slate-800"
                          : "text-slate-400"
                      }`}
                    >
                      {row.qatariParticipations}
                    </td>
                    <td
                      onClick={() =>
                        row.nonQatariParticipations > 0 &&
                        setSelectedCell({
                          title: "المشاركات غير القطرية",
                          categoryName: row.categoryName,
                          count: row.nonQatariParticipations,
                        })
                      }
                      className={`py-3 px-3 text-center font-mono border-l border-slate-200 ${
                        row.nonQatariParticipations > 0
                          ? "cursor-pointer hover:bg-slate-100 font-bold text-slate-800"
                          : "text-slate-400"
                      }`}
                    >
                      {row.nonQatariParticipations}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 border-l border-slate-200">
                      {row.totalParticipations}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700 border-l border-slate-200">
                      {row.uniqueParticipants}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-700 border-l border-slate-200">
                      {row.participationRate}%
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-[#8A1538] border-l border-slate-200">
                      {row.qatariRatio}%
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-600">
                      {row.nonQatariRatio}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-100/80 font-bold text-slate-800 border-t-2 border-slate-300">
              <tr>
                <td colSpan={2} className="py-3.5 px-4 text-center border-l border-slate-200">
                  المجموع العام المعتمد
                </td>
                <td className="py-3.5 px-3 text-center font-black border-l border-slate-200">
                  {data.totalActivities}
                </td>
                <td className="py-3.5 px-3 text-center font-black border-l border-slate-200">
                  {data.rows.reduce((acc, r) => acc + r.qatariParticipations, 0)}
                </td>
                <td className="py-3.5 px-3 text-center font-black border-l border-slate-200">
                  {data.rows.reduce((acc, r) => acc + r.nonQatariParticipations, 0)}
                </td>
                <td className="py-3.5 px-3 text-center font-black border-l border-slate-200">
                  {data.totalParticipations}
                </td>
                <td className="py-3.5 px-3 text-center font-black text-emerald-800 border-l border-slate-200">
                  {data.uniqueParticipants}
                </td>
                <td className="py-3.5 px-3 text-center font-black text-[#8A1538]" colSpan={3}>
                  نسبة المشاركة الكلية: {data.overallParticipationRate}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Printable Official Signatures Footer */}
        <OfficialPrintFooter />
      </div>

      {/* Drill-down Modal */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md bg-white p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-sm text-slate-900">{selectedCell.title}</h4>
                <p className="text-xs text-slate-500">{selectedCell.categoryName}</p>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
              <span className="text-xs text-slate-500 font-medium">عدد السجلات المطابقة</span>
              <span className="text-3xl font-black text-[#8A1538] block">{selectedCell.count}</span>
              <span className="text-[11px] text-slate-400">سجل مشاركة موثق</span>
            </div>

            <p className="text-xs text-slate-500 text-center">
              يمكنك الاطلاع على قائمة الطلاب المفصلة من خلال صفحة تفاصيل النشاط أو سجل الطلاب.
            </p>

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setSelectedCell(null)}
              >
                إغلاق
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
