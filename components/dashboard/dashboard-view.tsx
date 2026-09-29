"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DetailedDashboardData } from "@/lib/services/statistics-service";
import {
  RotateCcw,
  RefreshCw,
  Users,
  UserCheck,
  UserX,
  Target,
  BarChart2,
  PieChart,
  School,
  Layers,
  ArrowLeft,
  ChevronDown,
  Camera,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { PrintButton } from "@/components/ui/PrintButton";
import { OfficialPrintHeader } from "@/components/reports/OfficialPrintHeader";
import { OfficialPrintFooter } from "@/components/reports/OfficialPrintFooter";

interface DashboardViewProps {
  data: DetailedDashboardData;
}

export function DashboardView({ data }: DashboardViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const selectedGradeId = searchParams.get("gradeId") || "";
  const selectedSectionId = searchParams.get("sectionId") || "";
  const selectedCategoryId = searchParams.get("categoryId") || "";
  const selectedPeriod = searchParams.get("period") || "";
  const selectedMonth = searchParams.get("month") || "";
  const selectedDate = searchParams.get("date") || "";
  const selectedFrom = searchParams.get("from") || "";
  const selectedTo = searchParams.get("to") || "";

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleResetFilters = () => {
    router.push("/dashboard");
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/dashboard?${params.toString()}`);
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

    router.push(`/dashboard?${params.toString()}`);
  };

  const { metrics } = data;

  return (
    <div className="space-y-4 pb-8 font-sans">
      {/* Printable Official Header (Shown only during print) */}
      <div className="hidden print:block mb-6">
        <OfficialPrintHeader
          schoolName={data.schoolName}
          reportTitle="ملخص لوحة المؤشرات العامة للأنشطة"
          academicYearName={data.activeYearName}
        />
      </div>

      {/* 1. Header Bar: Action Buttons (Left) & Title Pill (Right) */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>تحديث البيانات</span>
          </button>

          <PrintButton label="طباعة المؤشرات (HTML / PDF)" variant="outline" size="sm" />
        </div>

        <div className="px-5 py-1.5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <h1 className="text-sm font-black text-slate-900 tracking-tight">
            لوحة المؤشرات العامة
          </h1>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-2 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        {/* Reset Button (Left) */}
        <button
          type="button"
          onClick={handleResetFilters}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>إعادة ضبط</span>
        </button>

        {/* Filter Selects & Date Range (Right) */}
        <div className="flex flex-wrap items-center gap-2">
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
              className="appearance-none bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-medium rounded-lg px-3 py-1.5 pl-7 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-[#8A1538]"
            >
              <option value="">الفترة: طوال العام</option>
              <option value="today">الفترة: اليوم</option>
              <option value="week">الفترة: هذا الأسبوع</option>
              <option value="month">الفترة: هذا الشهر (الشهر الحالي)</option>
              <option value="specific_month">الفترة: شهر معين (اختر من القائمة)...</option>
              <option value="term1">الفترة: الفصل الدراسي الأول</option>
              <option value="term2">الفترة: الفصل الدراسي الثاني</option>

              <optgroup label="اختيار مباشر للشهر">
                <option value="month_1">شهر يناير (1)</option>
                <option value="month_2">شهر فبراير (2)</option>
                <option value="month_3">شهر مارس (3)</option>
                <option value="month_4">شهر أبريل (4)</option>
                <option value="month_5">شهر مايو (5)</option>
                <option value="month_6">شهر يونيو (6)</option>
                <option value="month_7">شهر يوليو (7)</option>
                <option value="month_8">شهر أغسطس (8)</option>
                <option value="month_9">شهر سبتمبر (9)</option>
                <option value="month_10">شهر أكتوبر (10)</option>
                <option value="month_11">شهر نوفمبر (11)</option>
                <option value="month_12">شهر ديسمبر (12)</option>
              </optgroup>

              <optgroup label="فترة وتاريخ مخصص">
                <option value="single_date">تاريخ محدد (يوم معين)</option>
                <option value="custom">فترة مخصصة (من - إلى)</option>
              </optgroup>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={selectedCategoryId}
              onChange={(e) => handleFilterChange("categoryId", e.target.value)}
              className="appearance-none bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-medium rounded-lg px-3 py-1.5 pl-7 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-[#8A1538]"
            >
              <option value="">مجال النشاط: الكل</option>
              {data.allCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_ar}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Section Filter */}
          <div className="relative">
            <select
              value={selectedSectionId}
              onChange={(e) => handleFilterChange("sectionId", e.target.value)}
              className="appearance-none bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-medium rounded-lg px-3 py-1.5 pl-7 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-[#8A1538]"
            >
              <option value="">الشعبة: الكل</option>
              {data.allSections.map((s) => (
                <option key={s.id} value={s.id}>
                  شعبة {s.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Grade Filter */}
          <div className="relative">
            <select
              value={selectedGradeId}
              onChange={(e) => handleFilterChange("gradeId", e.target.value)}
              className="appearance-none bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-medium rounded-lg px-3 py-1.5 pl-7 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-[#8A1538]"
            >
              <option value="">الصف: الكل</option>
              {data.allGrades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name_ar}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 3. Top Metrics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* Right Section: 2 Rows of Cards (Col 1 to 9 in RTL = Right Side) */}
        <div className="lg:col-span-9 flex flex-col gap-3.5">
          {/* Upper Row: 5 Cards (Right-to-Left: Dark Card, Total Students, Participants, Activities, Avg Participations) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-stretch">
            {/* 1. معدل المشاركة الطلابي (Dark Card - Rightmost in RTL) */}
            <div className="bg-[#111827] rounded-2xl p-3.5 text-white flex flex-col justify-between shadow-xs border border-slate-800">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-slate-300">معدل المشاركة الطلابي</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {metrics.participationRate < 50 ? "تحتاج متابعة" : "أداء متميز"}
                </span>
              </div>

              <div className="my-1.5">
                <span className="text-3xl font-black text-white block">
                  {metrics.participationRate}%
                </span>
                {/* Progress Bar */}
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, metrics.participationRate)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>{metrics.uniqueParticipants} من {metrics.totalPopulation} طالب</span>
                <span className="text-[9px] text-slate-500">مشاركة أكبر ... مستقبل أفضل</span>
              </div>
            </div>

            {/* 2. إجمالي الطلاب */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-2xl font-black text-slate-800 block">
                  {metrics.totalPopulation}
                </span>
                <span className="text-xs font-bold text-slate-700 block mt-0.5">
                  إجمالي الطلاب
                </span>
                <span className="text-[10px] text-slate-400 block">
                  قطري {data.qatariPopulation} | غير قطري {data.nonQatariPopulation}
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#8A1538] to-rose-700 flex items-center justify-center text-white shadow-xs shrink-0">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* 3. الطلاب المشاركون */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-2xl font-black text-slate-800 block">
                  {metrics.uniqueParticipants}
                </span>
                <span className="text-xs font-bold text-slate-700 block mt-0.5">
                  الطلاب المشاركون
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {metrics.qatariParticipants} قطري | {metrics.nonQatariParticipants} غير قطري
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xs shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>

            {/* 4. الأنشطة المنفذة */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-2xl font-black text-slate-800 block">
                  {metrics.totalActivities}
                </span>
                <span className="text-xs font-bold text-slate-700 block mt-0.5">
                  الأنشطة المنفذة
                </span>
                <span className="text-[10px] text-slate-400 block">
                  مكتمل: {data.completedActivities} | مسودة: {data.draftActivities}
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
                <Target className="w-5 h-5" />
              </div>
            </div>

            {/* 5. متوسط المشاركات */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-2xl font-black text-slate-800 block">
                  {data.averageParticipationsPerStudent}
                </span>
                <span className="text-xs font-bold text-slate-700 block mt-0.5">
                  متوسط المشاركات
                </span>
                <span className="text-[10px] text-slate-400 block">لكل طالب نشط</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-white shadow-xs shrink-0">
                <BarChart2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Lower Row: 3 Cards (Right-to-Left: Non-participants, Inactive Sections, Active Categories) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* A. الطلاب غير المشاركين (Rightmost in lower row) */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xl font-black text-rose-600 block">
                  {metrics.nonParticipants}
                </span>
                <span className="text-xs font-bold text-slate-700 block mt-0.5">
                  الطلاب غير المشاركين
                </span>
                <span className="text-[10px] text-slate-400 block">
                  يمثلون {data.nonParticipationPercentage}% من إجمالي الطلاب
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-xs shrink-0">
                <UserX className="w-5 h-5" />
              </div>
            </div>

            {/* B. شعب دون أي مشاركة (Middle) */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xl font-black text-slate-800 block">
                  {data.inactiveSectionsCount} من {data.totalSectionsCount}
                </span>
                <span className="text-xs font-bold text-slate-700 block mt-0.5">
                  شعبة دون أي مشاركة
                </span>
                <span className="text-[10px] text-slate-400 block">شعبة لم تسجل مشاركات بعد</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center text-slate-900 shadow-xs shrink-0">
                <School className="w-5 h-5" />
              </div>
            </div>

            {/* C. المجالات والخطط المفعلة (Left) */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xl font-black text-purple-700 block">
                  {data.activeCategoriesCount} من {data.totalCategoriesCount}
                </span>
                <span className="text-xs font-bold text-slate-700 block mt-0.5">
                  المجالات والخطط المفعلة
                </span>
                <span className="text-[10px] text-slate-400 block">مجال تم تفعيله بالأنشطة</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-400 flex items-center justify-center text-white shadow-xs shrink-0">
                <Layers className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Leftmost Card: Motivational School Quote Card with back.jpg */}
        <div
          className="lg:col-span-3 rounded-2xl p-5 text-white flex flex-col justify-between relative overflow-hidden shadow-sm border border-slate-800 bg-slate-900 bg-cover bg-center"
          style={{ backgroundImage: "url('/back.jpg')" }}
        >
          {/* Contrast Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/80 z-0" />

          {/* Quote Content */}
          <div className="text-center pt-2 relative z-10">
            <span className="text-[#C59B27] font-serif text-3xl font-black block leading-none">
              “
            </span>
            <p className="text-sm font-bold text-white leading-snug mt-1 drop-shadow-sm">
              الأنشطة تصنع الفرق في الطلاب
            </p>
            <p className="text-xs font-medium text-slate-200 mt-1 drop-shadow-sm">
              وتبني مهارات المستقبل
            </p>
          </div>

          <div className="text-center pt-6 pb-1 border-t border-white/20 mt-4 relative z-10">
            <p className="text-xs font-bold text-[#C59B27] tracking-wide drop-shadow-sm">
              مدرسة عبد الله بن على المسند الثانوية للبنين
            </p>
            <p className="text-[10px] text-slate-300 mt-0.5 drop-shadow-sm">
              نظام إدارة الأنشطة والفعاليات
            </p>
          </div>
        </div>
      </div>

      {/* 4. Middle Section: Two Side-by-Side Cards (Right: Grades Breakdown, Left: Categories Distribution) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Right Box (Cols 1 to 7 in RTL = Right Side): مشاركة الطلاب حسب الصف الدراسي */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900">
                مشاركة الطلاب حسب الصف الدراسي
              </h3>
            </div>
            <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
              مقارنة عدد ونسبة المشاركين في كل صف
            </span>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {data.gradeBreakdown.map((grade) => (
              <div key={grade.gradeId} className="py-2.5 flex items-center justify-between gap-4">
                {/* Right: Grade Name & Total Students */}
                <div className="w-32 text-right shrink-0">
                  <span className="text-xs font-bold text-slate-900 block leading-tight">
                    {grade.gradeName}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    إجمالي: {grade.totalStudents} طالب
                  </span>
                </div>

                {/* Middle: Horizontal Progress Bar */}
                <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      grade.participationRate > 0 ? "bg-emerald-600" : "bg-transparent"
                    }`}
                    style={{ width: `${Math.min(100, grade.participationRate)}%` }}
                  />
                </div>

                {/* Left: Participation Rate & Count */}
                <div className="w-24 text-left font-mono shrink-0">
                  <span
                    className={`text-xs font-bold ${
                      grade.participationRate > 0 ? "text-emerald-600" : "text-slate-400"
                    }`}
                  >
                    ({grade.participationRate}%) {grade.participantsCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Left Box (Cols 8 to 12 in RTL = Left Side): توزيع الأنشطة حسب المجال والتصنيف */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <PieChart className="w-4 h-4 text-[#8A1538]" />
                <h3 className="text-xs font-bold text-slate-900">
                  توزيع الأنشطة حسب المجال والتصنيف
                </h3>
              </div>
              <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                التنافسية بين الخطط المعتمدة والمناسبات
              </span>
            </div>

            {/* Segmented Bar */}
            <div className="my-4">
              {data.categoryDistribution.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  لم يتم تنفيذ أي أنشطة في هذا النطاق بعد
                </div>
              ) : (
                <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden">
                  {data.categoryDistribution.map((cat) => (
                    <div
                      key={cat.categoryId}
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.color,
                      }}
                      title={`${cat.name}: ${cat.count} نشاط (${cat.percentage}%)`}
                      className="h-full transition-all duration-300"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Legend Items */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {data.categoryDistribution.map((cat) => (
              <div key={cat.categoryId} className="flex items-center gap-1.5 text-xs">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-slate-700 font-medium">
                  {cat.name}: <strong>{cat.count}</strong> ({cat.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Bottom Section: Two Side-by-Side Cards (Right: Recent Activities, Left: Priority Sections) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Right Box (Cols 1 to 7 in RTL = Right Side): أحدث الأنشطة والفعاليات المنفذة */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            {/* Title on Right */}
            <div className="flex items-center gap-1.5">
              <span className="text-[#8A1538] text-sm">★</span>
              <h3 className="text-xs font-bold text-slate-900">أحدث الأنشطة والفعاليات المنفذة</h3>
            </div>

            {/* Link on Left */}
            <Link
              href="/activities"
              className="text-xs font-bold text-[#8A1538] hover:text-[#6a102b] flex items-center gap-1 transition-colors"
            >
              <span>عرض كل الأنشطة</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          {data.recentActivities.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              لم يتم تنفيذ أي أنشطة بعد في هذا العام الدراسي.
            </div>
          ) : (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">م</th>
                    <th className="py-2.5 px-3">التاريخ</th>
                    <th className="py-2.5 px-3">اسم النشاط</th>
                    <th className="py-2.5 px-3">المجال</th>
                    <th className="py-2.5 px-3 text-center">المشاركون</th>
                    <th className="py-2.5 px-3 text-center">توثيق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {data.recentActivities.map((act, idx) => {
                    const dateStr = new Date(act.activity_date).toISOString().split("T")[0];

                    return (
                      <tr key={act.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono">{dateStr}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{act.name}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {act.categoryName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                          {act.totalParticipants}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Link href={`/activities/${act.id}`}>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-[#8A1538] border border-rose-200 rounded text-[11px] font-bold transition-colors"
                            >
                              <Camera className="w-3 h-3" />
                              <span>توثيق</span>
                            </button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Left Box (Cols 8 to 12 in RTL = Left Side): الشعب الأكثر حاجة للمتابعة */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              {/* Title on Right */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">الشعب الأكثر حاجة للمتابعة</h3>
                </div>
              </div>

              {/* Link on Left */}
              <Link
                href="/participations"
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors"
              >
                <span>تسجيل مشاركات</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </Link>
            </div>

            {data.prioritySections.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                لا توجد شعب بحاجة لمتابعة خاصة حالياً.
              </div>
            ) : (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">الصف والشعبة</th>
                      <th className="py-2.5 px-2 text-center w-20">الطلاب</th>
                      <th className="py-2.5 px-3 min-w-[125px]">نسبة المشاركة</th>
                      <th className="py-2.5 px-2 text-center w-16">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {data.prioritySections.map((sec) => {
                      const isZero = sec.participationRate === 0;
                      const isCritical = sec.participationRate < 5;

                      return (
                        <tr
                          key={sec.classGroupId}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          {/* 1. الصف والشعبة */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-800 whitespace-nowrap">
                                {sec.gradeName}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                شعبة {sec.sectionName}
                              </span>
                            </div>
                          </td>

                          {/* 2. عدد الطلاب (محاذاة رقمية دقيقة) */}
                          <td className="py-2.5 px-2 text-center whitespace-nowrap">
                            <span className="font-mono tabular-nums font-bold text-slate-700 text-xs">
                              {sec.totalStudents}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal mr-1">طالب</span>
                          </td>

                          {/* 3. نسبة المشاركة مع شريط مرئي دقيق */}
                          <td className="py-2.5 px-3">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-1.5">
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono tabular-nums border ${
                                    isZero
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : isCritical
                                      ? "bg-rose-50/80 text-rose-600 border-rose-200"
                                      : "bg-amber-50 text-amber-700 border-amber-200"
                                  }`}
                                >
                                  {sec.participationRate}%
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ({sec.participantsCount} مشارك)
                                </span>
                              </div>
                              {/* شريط الإنجاز المرئي */}
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isCritical ? "bg-rose-500" : "bg-amber-500"
                                  }`}
                                  style={{
                                    width: `${Math.min(100, Math.max(sec.participationRate, isZero ? 0 : 3))}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* 4. زر التسجيل محاذى عمودياً بدقة */}
                          <td className="py-2.5 px-2 text-center whitespace-nowrap">
                            <Link href={`/participations?gradeName=${encodeURIComponent(sec.gradeName)}`}>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 hover:border-emerald-300 rounded-md text-[11px] font-bold transition-colors shadow-2xs"
                                title={`تسجيل مشاركات لـ ${sec.gradeName} - شعبة ${sec.sectionName}`}
                              >
                                <Plus className="w-3 h-3 text-emerald-600" />
                                <span>تسجيل</span>
                              </button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Printable Official Signatures Footer (Shown only during print) */}
      <div className="hidden print:block mt-8">
        <OfficialPrintFooter />
      </div>
    </div>
  );
}
