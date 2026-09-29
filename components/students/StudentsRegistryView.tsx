"use client";

import React, { useState, useTransition, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/ui/PrintButton";
import { OfficialPrintHeader } from "@/components/reports/OfficialPrintHeader";
import { OfficialPrintFooter } from "@/components/reports/OfficialPrintFooter";
import {
  Users,
  Flag,
  Globe,
  HelpCircle,
  Plus,
  Search,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  X,
  RotateCcw,
  Loader2,
  Filter,
  Eye,
  Trophy,
  Award,
  Pencil,
  MoreHorizontal,
  Printer,
  Copy,
  Check,
  ChevronDown,
  Calendar,
  ExternalLink,
  PlusCircle,
  Sparkles,
  UserCheck,
  UserX,
  FileText,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  quickUpdateStudentAction,
  toggleStudentStatusAction,
} from "@/app/actions/student-actions";

export interface StudentActivityParticipation {
  id: string;
  notes?: string | null;
  created_at?: Date | string;
  activity: {
    id: string;
    name: string;
    activity_date: Date | string;
    status: string;
    category?: {
      id: string;
      code: string;
      name_ar: string;
    } | null;
  };
}

export interface StudentItem {
  id: string;
  academic_number: string | null;
  personal_number?: string | null;
  full_name_ar: string;
  full_name_en: string | null;
  nationality: string | null;
  nationality_group: string | null;
  notes?: string | null;
  is_active: boolean;
  enrollments: Array<{
    class_group: {
      grade_level: {
        name_ar: string;
      };
      section: {
        name: string;
      };
    };
  }>;
  participations?: Array<StudentActivityParticipation>;
}

export interface StudentMetricsData {
  total: number;
  qatari: number;
  nonQatari: number;
  missingNationality: number;
}

export interface StudentsRegistryViewProps {
  students: StudentItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  metrics: StudentMetricsData;
  gradeLevels: Array<{ id: string; name_ar: string }>;
  sections: Array<{ id: string; name: string }>;
  schoolName: string;
  academicYearName: string;
  initialFilters: {
    search?: string;
    gradeId?: string;
    sectionId?: string;
    nationality?: "QATARI" | "NON_QATARI" | "UNKNOWN" | "";
  };
}

function getCategoryBadgeStyle(code?: string) {
  switch (code) {
    case "APPROVED_PLAN":
      return {
        badge: "bg-blue-50 text-blue-800 border-blue-200/80",
        dot: "bg-blue-500",
      };
    case "LOCAL_GLOBAL_EVENTS":
      return {
        badge: "bg-amber-50 text-amber-800 border-amber-200/80",
        dot: "bg-amber-500",
      };
    case "NATIONAL_IDENTITY":
      return {
        badge: "bg-[#8A1538]/10 text-[#8A1538] border-[#8A1538]/30",
        dot: "bg-[#8A1538]",
      };
    case "EDUCATIONAL_VALUES":
      return {
        badge: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
        dot: "bg-emerald-500",
      };
    case "SUSTAINABILITY":
      return {
        badge: "bg-teal-50 text-teal-800 border-teal-200/80",
        dot: "bg-teal-500",
      };
    case "VISION_MISSION":
      return {
        badge: "bg-indigo-50 text-indigo-800 border-indigo-200/80",
        dot: "bg-indigo-500",
      };
    case "CIRCULARS_ACTIVITIES":
      return {
        badge: "bg-purple-50 text-purple-800 border-purple-200/80",
        dot: "bg-purple-500",
      };
    case "DEPARTMENT_PLANS":
      return {
        badge: "bg-sky-50 text-sky-800 border-sky-200/80",
        dot: "bg-sky-500",
      };
    default:
      return {
        badge: "bg-slate-100 text-slate-700 border-slate-200/80",
        dot: "bg-slate-400",
      };
  }
}

function formatArabicDate(dateVal?: Date | string | null) {
  if (!dateVal) return "—";
  try {
    const d = new Date(dateVal);
    return d.toLocaleDateString("ar-QA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(dateVal);
  }
}

export function StudentsRegistryView({
  students,
  total,
  page,
  pageSize,
  totalPages,
  metrics,
  gradeLevels,
  sections,
  schoolName,
  academicYearName,
  initialFilters,
}: StudentsRegistryViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Controlled search input for smooth typing experience
  const [searchValue, setSearchValue] = useState(initialFilters.search || "");
  const [selectedGrade, setSelectedGrade] = useState(initialFilters.gradeId || "");
  const [selectedSection, setSelectedSection] = useState(initialFilters.sectionId || "");
  const [selectedNationality, setSelectedNationality] = useState(initialFilters.nationality || "");

  // Interactive Modals and Actions State
  const [viewingActivitiesStudent, setViewingActivitiesStudent] = useState<StudentItem | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
  const [printingStudent, setPrintingStudent] = useState<StudentItem | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [copiedStudentId, setCopiedStudentId] = useState<string | null>(null);
  const [isQuickSaving, setIsQuickSaving] = useState(false);
  const [quickSaveError, setQuickSaveError] = useState<string | null>(null);
  const [isTogglingStatusId, setIsTogglingStatusId] = useState<string | null>(null);

  // Quick edit form state
  const [quickEditForm, setQuickEditForm] = useState({
    full_name_ar: "",
    full_name_en: "",
    academic_number: "",
    personal_number: "",
    nationality_group: "" as "QATARI" | "NON_QATARI" | "",
    nationality: "",
    notes: "",
    is_active: true,
  });

  // Sync state if props change (e.g. browser back/forward)
  useEffect(() => {
    setSearchValue(initialFilters.search || "");
    setSelectedGrade(initialFilters.gradeId || "");
    setSelectedSection(initialFilters.sectionId || "");
    setSelectedNationality(initialFilters.nationality || "");
  }, [initialFilters.search, initialFilters.gradeId, initialFilters.sectionId, initialFilters.nationality]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".student-action-menu-container")) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Core navigation function that applies filters immediately
  const applyFilters = useCallback(
    (newFilters: {
      search?: string;
      gradeId?: string;
      sectionId?: string;
      nationality?: string;
    }) => {
      const params = new URLSearchParams(searchParams.toString());

      // Update or delete search
      if (newFilters.search !== undefined) {
        if (newFilters.search.trim()) {
          params.set("search", newFilters.search.trim());
        } else {
          params.delete("search");
        }
      }

      // Update or delete gradeId
      if (newFilters.gradeId !== undefined) {
        if (newFilters.gradeId) {
          params.set("gradeId", newFilters.gradeId);
        } else {
          params.delete("gradeId");
        }
      }

      // Update or delete sectionId
      if (newFilters.sectionId !== undefined) {
        if (newFilters.sectionId) {
          params.set("sectionId", newFilters.sectionId);
        } else {
          params.delete("sectionId");
        }
      }

      // Update or delete nationality
      if (newFilters.nationality !== undefined) {
        if (newFilters.nationality) {
          params.set("nationality", newFilters.nationality);
        } else {
          params.delete("nationality");
        }
      }

      // Reset page to 1 whenever any filter changes
      params.delete("page");

      const query = params.toString() ? `?${params.toString()}` : "";
      startTransition(() => {
        router.replace(`${pathname}${query}`, { scroll: false });
      });
    },
    [router, pathname, searchParams]
  );

  // Debounce search input changes (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== (initialFilters.search || "")) {
        applyFilters({ search: searchValue });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, initialFilters.search, applyFilters]);

  // Immediate handlers for select dropdowns
  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedGrade(val);
    applyFilters({ gradeId: val });
  };

  const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedSection(val);
    applyFilters({ sectionId: val });
  };

  const handleNationalityChange = (val: string) => {
    setSelectedNationality(val as any);
    applyFilters({ nationality: val });
  };

  // Toggle nationality via KPI card click
  const handleCardNationalityClick = (group: "" | "QATARI" | "NON_QATARI" | "UNKNOWN") => {
    if (selectedNationality === group) {
      handleNationalityChange("");
    } else {
      handleNationalityChange(group);
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchValue("");
    setSelectedGrade("");
    setSelectedSection("");
    setSelectedNationality("");
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  };

  const hasActiveFilters = Boolean(
    searchValue || selectedGrade || selectedSection || selectedNationality
  );

  // Build pagination link preserving current query params
  const getPageUrl = (targetPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", targetPage.toString());
    return `${pathname}?${params.toString()}`;
  };

  // Open Quick Edit
  const handleOpenEdit = (student: StudentItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingStudent(student);
    setQuickEditForm({
      full_name_ar: student.full_name_ar || "",
      full_name_en: student.full_name_en || "",
      academic_number: student.academic_number || "",
      personal_number: student.personal_number || "",
      nationality_group: (student.nationality_group as any) || "",
      nationality: student.nationality || "",
      notes: student.notes || "",
      is_active: student.is_active,
    });
    setQuickSaveError(null);
    setActiveDropdownId(null);
  };

  // Save Quick Edit
  const handleSaveQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    if (!quickEditForm.full_name_ar.trim()) {
      setQuickSaveError("اسم الطالب بالعربية مطلوب");
      return;
    }

    try {
      setIsQuickSaving(true);
      setQuickSaveError(null);
      await quickUpdateStudentAction(editingStudent.id, {
        full_name_ar: quickEditForm.full_name_ar.trim(),
        full_name_en: quickEditForm.full_name_en.trim() || null,
        academic_number: quickEditForm.academic_number.trim() || null,
        personal_number: quickEditForm.personal_number.trim() || null,
        nationality_group: quickEditForm.nationality_group ? (quickEditForm.nationality_group as any) : null,
        nationality: quickEditForm.nationality.trim() || null,
        notes: quickEditForm.notes.trim() || null,
        is_active: quickEditForm.is_active,
      });
      setEditingStudent(null);
      router.refresh();
    } catch (err: any) {
      setQuickSaveError(err?.message || "حدث خطأ أثناء حفظ بيانات الطالب");
    } finally {
      setIsQuickSaving(false);
    }
  };

  // Copy Academic Number with Feedback
  const handleCopyAcademicNumber = (student: StudentItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!student.academic_number) return;
    navigator.clipboard.writeText(student.academic_number);
    setCopiedStudentId(student.id);
    setTimeout(() => {
      setCopiedStudentId(null);
    }, 2000);
  };

  // Toggle Student Active Status
  const handleToggleStatus = async (student: StudentItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setIsTogglingStatusId(student.id);
      await toggleStudentStatusAction(student.id, student.is_active);
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "حدث خطأ أثناء تعديل حالة الطالب");
    } finally {
      setIsTogglingStatusId(null);
      setActiveDropdownId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Official Print Header (Strictly for Printing & PDF Export Only) */}
      <div className="hidden print:block">
        <OfficialPrintHeader
          schoolName={schoolName}
          academicYearName={academicYearName}
          reportTitle="سجل وبيان بيانات الطلاب المقيدين ومشاركاتهم في الأنشطة"
          subtitle={`العام الدراسي ${academicYearName} • كشف متابعة النشاط الطلابي`}
        />
      </div>

      {/* Screen Only Unified Modern Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">سجل الطلاب</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#8A1538]/10 text-[#8A1538] border border-[#8A1538]/20">
                {total} طالب مسجل
              </span>
              {isPending && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>تحديث فوري...</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              إدارة بيانات الطلاب والصفوف والشعب ومتابعة المشاركة في الأنشطة المدرسية — {schoolName}
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <PrintButton
              label="طباعة السجل (PDF)"
              variant="outline"
              size="sm"
              className="gap-1.5 font-bold border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            />

            <Link href="/students/new">
              <Button
                size="sm"
                variant="primary"
                className="gap-1.5 font-bold shadow-xs bg-[#8A1538] hover:bg-[#72112E] text-white"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة طالب جديد</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Cohort Metric Cards */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity duration-200 ${
          isPending ? "opacity-60" : "opacity-100"
        }`}
      >
        {/* Total Students Card */}
        <Card
          onClick={() => handleCardNationalityClick("")}
          className={`p-4 bg-white cursor-pointer transition-all duration-150 hover:shadow-md select-none border-2 ${
            selectedNationality === "" && hasActiveFilters
              ? "border-slate-800 shadow-xs"
              : "border-slate-200 hover:border-slate-300"
          }`}
          title="عرض جميع الطلاب بدون تصفية جنسية"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">إجمالي طلاب النطاق</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-2xl font-black text-slate-800">{metrics.total}</p>
            <span className="text-[10px] text-slate-400 font-medium">طالب</span>
          </div>
        </Card>

        {/* Qatari Students Card */}
        <Card
          onClick={() => handleCardNationalityClick("QATARI")}
          className={`p-4 bg-white cursor-pointer transition-all duration-150 hover:shadow-md select-none border-2 ${
            selectedNationality === "QATARI"
              ? "border-[#8A1538] bg-[#8A1538]/5 ring-2 ring-[#8A1538]/20 shadow-xs"
              : "border-slate-200 hover:border-[#8A1538]/40 border-r-4 border-r-[#8A1538]"
          }`}
          title="اضغط للتصفية السريعة للطلاب القطريين"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8A1538]">الطلاب القطريون</span>
            <Flag className="w-4 h-4 text-[#8A1538]" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-2xl font-black text-[#8A1538]">{metrics.qatari}</p>
            {metrics.total > 0 && (
              <span className="text-[11px] font-bold text-[#8A1538]/80 font-mono">
                {Math.round((metrics.qatari / metrics.total) * 100)}%
              </span>
            )}
          </div>
        </Card>

        {/* Non-Qatari Students Card */}
        <Card
          onClick={() => handleCardNationalityClick("NON_QATARI")}
          className={`p-4 bg-white cursor-pointer transition-all duration-150 hover:shadow-md select-none border-2 ${
            selectedNationality === "NON_QATARI"
              ? "border-slate-700 bg-slate-50 ring-2 ring-slate-400/20 shadow-xs"
              : "border-slate-200 hover:border-slate-400 border-r-4 border-r-slate-400"
          }`}
          title="اضغط للتصفية السريعة للطلاب غير القطريين"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">الطلاب غير القطريين</span>
            <Globe className="w-4 h-4 text-slate-500" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-2xl font-black text-slate-800">{metrics.nonQatari}</p>
            {metrics.total > 0 && (
              <span className="text-[11px] font-bold text-slate-500 font-mono">
                {Math.round((metrics.nonQatari / metrics.total) * 100)}%
              </span>
            )}
          </div>
        </Card>

        {/* Missing Nationality Card */}
        <Card
          onClick={() => handleCardNationalityClick("UNKNOWN")}
          className={`p-4 bg-white cursor-pointer transition-all duration-150 hover:shadow-md select-none border-2 ${
            selectedNationality === "UNKNOWN"
              ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/30 shadow-xs"
              : "border-slate-200 hover:border-amber-300 border-r-4 border-r-amber-500"
          }`}
          title="اضغط للتصفية السريعة للطلاب غير محددي الجنسية"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">بيانات جنسية ناقصة</span>
            <HelpCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-2xl font-black text-amber-700">{metrics.missingNationality}</p>
            <span className="text-[10px] text-amber-600 font-medium">بحاجة لتحديث</span>
          </div>
        </Card>
      </div>

      {/* Live Interactive Search and Filters Bar */}
      <Card className="p-4 bg-white border border-slate-200 shadow-2xs print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
          {/* Instant Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="البحث الفوري بالاسم أو الرقم الأكاديمي..."
              className="w-full pr-9 pl-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:border-transparent focus:outline-none transition-all placeholder:text-slate-400 font-medium"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => {
                  setSearchValue("");
                  applyFilters({ search: "" });
                }}
                className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-200 transition-colors"
                title="مسح نص البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Grade Filter */}
          <div>
            <select
              value={selectedGrade}
              onChange={handleGradeChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:border-transparent focus:outline-none font-semibold text-slate-700 transition-all cursor-pointer"
            >
              <option value="">جميع الصفوف الدراسية</option>
              {gradeLevels.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name_ar}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <select
              value={selectedSection}
              onChange={handleSectionChange}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:border-transparent focus:outline-none font-semibold text-slate-700 transition-all cursor-pointer"
            >
              <option value="">جميع الشعب</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  الشعبة {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Nationality Filter & Reset Button */}
          <div className="flex items-center gap-2">
            <select
              value={selectedNationality}
              onChange={(e) => handleNationalityChange(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:border-transparent focus:outline-none font-semibold text-slate-700 transition-all cursor-pointer"
            >
              <option value="">كل الجنسيات</option>
              <option value="QATARI">قطري</option>
              <option value="NON_QATARI">غير قطري</option>
              <option value="UNKNOWN">غير محدد</option>
            </select>

            {hasActiveFilters && (
              <Button
                type="button"
                onClick={handleResetFilters}
                size="sm"
                variant="outline"
                className="px-2.5 h-8 text-xs font-bold text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors shrink-0"
                title="إعادة ضبط وتفريغ كل الفلاتر"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">إعادة ضبط</span>
              </Button>
            )}
          </div>
        </div>

        {/* Live Filter Indicator Bar */}
        {hasActiveFilters && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700 inline-flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-[#8A1538]" />
                <span>الفلاتر النشطة:</span>
              </span>
              {searchValue && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                  بحث: {searchValue}
                  <button
                    onClick={() => {
                      setSearchValue("");
                      applyFilters({ search: "" });
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedGrade && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#8A1538]/10 text-[#8A1538] font-bold text-[11px]">
                  {gradeLevels.find((g) => g.id === selectedGrade)?.name_ar}
                  <button onClick={() => applyFilters({ gradeId: "" })} className="hover:text-rose-600 cursor-pointer">
                    ×
                  </button>
                </span>
              )}
              {selectedSection && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                  الشعبة {sections.find((s) => s.id === selectedSection)?.name}
                  <button onClick={() => applyFilters({ sectionId: "" })} className="hover:text-rose-600 cursor-pointer">
                    ×
                  </button>
                </span>
              )}
              {selectedNationality && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                  الجنسية:{" "}
                  {selectedNationality === "QATARI"
                    ? "قطري"
                    : selectedNationality === "NON_QATARI"
                    ? "غير قطري"
                    : "غير محدد"}
                  <button onClick={() => applyFilters({ nationality: "" })} className="hover:text-rose-600 cursor-pointer">
                    ×
                  </button>
                </span>
              )}
            </div>

            <button
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-[#8A1538] hover:underline cursor-pointer"
            >
              مسح الكل
            </button>
          </div>
        )}
      </Card>

      {/* Students Table Container */}
      <Card
        className={`p-0 overflow-hidden bg-white border border-slate-200 shadow-2xs transition-opacity duration-200 ${
          isPending ? "opacity-60 pointer-events-none" : "opacity-100"
        }`}
      >
        {students.length === 0 ? (
          <div className="text-center py-16 text-slate-400 space-y-3">
            <GraduationCap className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-600">
              لم يتم العثور على طلاب مطابقين لمعايير البحث الحالية.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              {hasActiveFilters && (
                <Button size="sm" variant="outline" onClick={handleResetFilters}>
                  إلغاء الفلاتر وعرض الجميع
                </Button>
              )}
              <Link href="/students/new">
                <Button size="sm" variant="primary" className="bg-[#8A1538] hover:bg-[#72112E]">
                  إضافة طالب جديد
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 w-12 text-center">م</th>
                    <th className="py-3.5 px-4">الرقم الأكاديمي</th>
                    <th className="py-3.5 px-4 min-w-[170px]">اسم الطالب</th>
                    <th className="py-3.5 px-4 text-center">الجنسية</th>
                    <th className="py-3.5 px-4">الصف</th>
                    <th className="py-3.5 px-4">الشعبة</th>
                    <th className="py-3.5 px-4 text-center min-w-[210px]">
                      <span className="inline-flex items-center justify-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-[#8A1538]" />
                        <span>الأنشطة المشارك بها</span>
                      </span>
                    </th>
                    <th className="py-3.5 px-4 text-center">الحالة</th>
                    <th className="py-3.5 px-4 text-center min-w-[170px] print:hidden">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {students.map((student, idx) => {
                    const serialNumber = (page - 1) * pageSize + idx + 1;
                    const latestEnrollment = student.enrollments[0];
                    const gradeName = latestEnrollment?.class_group.grade_level.name_ar || "—";
                    const sectionName = latestEnrollment?.class_group.section.name || "—";
                    const activitiesCount = student.participations?.length || 0;
                    const isDropdownOpen = activeDropdownId === student.id;
                    const isCopied = copiedStudentId === student.id;
                    const isStatusLoading = isTogglingStatusId === student.id;

                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* Serial Number */}
                        <td className="py-3.5 px-4 text-center text-slate-400 font-mono font-bold">
                          {serialNumber}
                        </td>

                        {/* Academic Number with One-Click Copy */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                          {student.academic_number ? (
                            <button
                              type="button"
                              onClick={(e) => handleCopyAcademicNumber(student, e)}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors group/num cursor-pointer"
                              title="انقر لنسخ الرقم الأكاديمي"
                            >
                              <span>{student.academic_number}</span>
                              {isCopied ? (
                                <Check className="w-3 h-3 text-emerald-600 animate-in zoom-in" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-300 opacity-0 group-hover/num:opacity-100 transition-opacity" />
                              )}
                            </button>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Student Name */}
                        <td className="py-3.5 px-4">
                          <Link
                            href={`/students/${student.id}`}
                            className="font-bold text-slate-900 hover:text-[#8A1538] transition-colors"
                          >
                            {student.full_name_ar}
                          </Link>
                          {student.full_name_en && (
                            <span className="block text-[11px] text-slate-400 font-normal mt-0.5" dir="ltr">
                              {student.full_name_en}
                            </span>
                          )}
                        </td>

                        {/* Nationality */}
                        <td className="py-3.5 px-4 text-center">
                          {student.nationality_group === "QATARI" ? (
                            <Badge variant="maroon">قطري</Badge>
                          ) : student.nationality_group === "NON_QATARI" ? (
                            <Badge variant="neutral">{student.nationality || "غير قطري"}</Badge>
                          ) : (
                            <Badge variant="warning">قيد المراجعة</Badge>
                          )}
                        </td>

                        {/* Grade */}
                        <td className="py-3.5 px-4 text-slate-700 font-semibold">{gradeName}</td>

                        {/* Section */}
                        <td className="py-3.5 px-4 text-slate-700 font-semibold">{sectionName}</td>

                        {/* 🌟 ENHANCED FIELD 1: Participated Activities */}
                        <td className="py-3 px-4 text-center">
                          {activitiesCount > 0 ? (
                            <div className="flex flex-col items-center justify-center gap-1.5 py-0.5">
                              {/* Interactive Main Count Badge */}
                              <button
                                type="button"
                                onClick={() => setViewingActivitiesStudent(student)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 border border-emerald-200/90 hover:border-emerald-400 hover:bg-emerald-100 hover:shadow-2xs transition-all cursor-pointer group/badge"
                                title="انقر لعرض تفاصيل جميع الأنشطة"
                              >
                                <Trophy className="w-3.5 h-3.5 text-emerald-600 group-hover/badge:scale-110 transition-transform" />
                                <span>{activitiesCount}</span>
                                <span className="text-[10.5px] font-bold text-emerald-700">
                                  {activitiesCount === 1 ? "نشاط" : activitiesCount === 2 ? "نشاطان" : "أنشطة"}
                                </span>
                                <ChevronDown className="w-3 h-3 text-emerald-600/70 group-hover/badge:translate-y-0.5 transition-transform" />
                              </button>

                              {/* Recent Activity Tags Preview */}
                              <div className="flex flex-wrap items-center justify-center gap-1 max-w-[220px]">
                                {student.participations?.slice(0, 2).map((p) => {
                                  const categoryColor = getCategoryBadgeStyle(p.activity.category?.code || "");
                                  return (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => setViewingActivitiesStudent(student)}
                                      className="inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-md bg-slate-100/90 text-slate-700 font-semibold border border-slate-200/70 max-w-[135px] truncate hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
                                      title={`${p.activity.name} • ${p.activity.category?.name_ar || "عام"}`}
                                    >
                                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${categoryColor.dot}`} />
                                      <span className="truncate">{p.activity.name}</span>
                                    </button>
                                  );
                                })}

                                {(student.participations?.length || 0) > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => setViewingActivitiesStudent(student)}
                                    className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-[#8A1538]/10 text-[#8A1538] hover:bg-[#8A1538]/20 transition-colors cursor-pointer"
                                    title={`عرض ${(student.participations?.length || 0) - 2} أنشطة إضافية`}
                                  >
                                    +{(student.participations?.length || 0) - 2}
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1 py-1">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-slate-400 bg-slate-50 border border-slate-200/80 select-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                <span>لا توجد مشاركات</span>
                              </span>
                              <Link
                                href={`/participations`}
                                className="text-[10.5px] text-[#8A1538] hover:underline font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                + تسجيل نشاط
                              </Link>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => handleToggleStatus(student, e)}
                            disabled={isStatusLoading}
                            className="inline-block cursor-pointer transition-transform hover:scale-105"
                            title="انقر لتغيير حالة قيد الطالب (نشط / مؤرشف)"
                          >
                            <Badge variant={student.is_active ? "success" : "neutral"}>
                              {isStatusLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin inline-block mr-1" />
                              ) : null}
                              {student.is_active ? "نشط" : "مؤرشف"}
                            </Badge>
                          </button>
                        </td>

                        {/* 🌟 ENHANCED FIELD 2: Unified Professional Actions Hub */}
                        <td className="py-3.5 px-4 text-center print:hidden">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Primary Action Button: View Profile */}
                            <Link href={`/students/${student.id}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 text-xs font-bold gap-1 text-slate-700 hover:text-white hover:bg-[#8A1538] hover:border-[#8A1538] shadow-2xs transition-colors rounded-lg"
                                title="عرض الملف الأكاديمي الشامل للطالب"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>الملف</span>
                              </Button>
                            </Link>

                            {/* Quick Action: Activities Peek (if student has activities) */}
                            {activitiesCount > 0 && (
                              <button
                                type="button"
                                onClick={() => setViewingActivitiesStudent(student)}
                                className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 flex items-center justify-center text-slate-500 transition-colors shadow-2xs cursor-pointer"
                                title="استعراض سريع لبطاقات الأنشطة"
                              >
                                <Trophy className="w-3.5 h-3.5 text-emerald-600" />
                              </button>
                            )}

                            {/* Quick Action: Quick Edit */}
                            <button
                              type="button"
                              onClick={(e) => handleOpenEdit(student, e)}
                              className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-800 flex items-center justify-center text-slate-500 transition-colors shadow-2xs cursor-pointer"
                              title="تعديل سريع لبيانات الطالب"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {/* More Actions Dropdown Menu */}
                            <div className="relative student-action-menu-container">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownId(isDropdownOpen ? null : student.id);
                                }}
                                className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors shadow-2xs cursor-pointer ${
                                  isDropdownOpen
                                    ? "bg-[#8A1538] text-white border-[#8A1538]"
                                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                }`}
                                title="المزيد من الإجراءات والخيارات"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>

                              {/* Dropdown Floating Menu */}
                              {isDropdownOpen && (
                                <div
                                  className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 text-right text-xs divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* Menu Group 1: Views & Edits */}
                                  <div className="p-1 space-y-0.5">
                                    <Link
                                      href={`/students/${student.id}`}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-[#8A1538] rounded-xl font-semibold transition-colors"
                                      onClick={() => setActiveDropdownId(null)}
                                    >
                                      <Eye className="w-4 h-4 text-slate-400" />
                                      <span>الملف الأكاديمي الكامل</span>
                                    </Link>

                                    <button
                                      type="button"
                                      onClick={(e) => handleOpenEdit(student, e)}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-[#8A1538] rounded-xl font-semibold transition-colors cursor-pointer"
                                    >
                                      <Pencil className="w-4 h-4 text-slate-400" />
                                      <span>تعديل سريع للبيانات</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setViewingActivitiesStudent(student);
                                        setActiveDropdownId(null);
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-emerald-700 rounded-xl font-semibold transition-colors cursor-pointer"
                                    >
                                      <Trophy className="w-4 h-4 text-emerald-600" />
                                      <span>استعراض سجل الأنشطة ({activitiesCount})</span>
                                    </button>
                                  </div>

                                  {/* Menu Group 2: Output & Registration */}
                                  <div className="p-1 space-y-0.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPrintingStudent(student);
                                        setActiveDropdownId(null);
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-semibold transition-colors cursor-pointer"
                                    >
                                      <Printer className="w-4 h-4 text-slate-400" />
                                      <span>طباعة كشف مشاركات الطالب</span>
                                    </button>

                                    <Link
                                      href="/participations"
                                      className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-[#8A1538] rounded-xl font-semibold transition-colors"
                                      onClick={() => setActiveDropdownId(null)}
                                    >
                                      <PlusCircle className="w-4 h-4 text-[#8A1538]" />
                                      <span>تسجيل في نشاط جديد</span>
                                    </Link>

                                    {student.academic_number && (
                                      <button
                                        type="button"
                                        onClick={(e) => handleCopyAcademicNumber(student, e)}
                                        className="w-full flex items-center justify-between px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold transition-colors cursor-pointer"
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <Copy className="w-4 h-4 text-slate-400" />
                                          <span>نسخ الرقم الأكاديمي</span>
                                        </div>
                                        {isCopied && (
                                          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                            <Check className="w-3 h-3" />
                                            <span>تم النسخ</span>
                                          </span>
                                        )}
                                      </button>
                                    )}
                                  </div>

                                  {/* Menu Group 3: Status Toggle */}
                                  <div className="p-1">
                                    <button
                                      type="button"
                                      onClick={(e) => handleToggleStatus(student, e)}
                                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-semibold transition-colors cursor-pointer ${
                                        student.is_active
                                          ? "text-rose-600 hover:bg-rose-50"
                                          : "text-emerald-700 hover:bg-emerald-50"
                                      }`}
                                    >
                                      {student.is_active ? (
                                        <>
                                          <UserX className="w-4 h-4" />
                                          <span>أرشفة الطالب (تعطيل)</span>
                                        </>
                                      ) : (
                                        <>
                                          <UserCheck className="w-4 h-4" />
                                          <span>تنشيط قيد الطالب</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 print:hidden">
                <span>
                  عرض {students.length} من أصل {total} طالب
                </span>
                <div className="flex items-center gap-1.5">
                  {page > 1 && (
                    <Link href={getPageUrl(page - 1)}>
                      <Button size="sm" variant="outline" className="h-8 gap-1">
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span>السابق</span>
                      </Button>
                    </Link>
                  )}
                  <span className="px-3 py-1 font-bold text-slate-700">
                    صفحة {page} من {totalPages}
                  </span>
                  {page < totalPages && (
                    <Link href={getPageUrl(page + 1)}>
                      <Button size="sm" variant="outline" className="h-8 gap-1">
                        <span>التالي</span>
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Official Signatures & Stamp Footer (Strictly for Printing & PDF Export Only) */}
      <div className="hidden print:block mt-8">
        <OfficialPrintFooter />
      </div>

      {/* ========================================================================= */}
      {/* 🌟 MODAL 1: Interactive Activities Flyout / Drawer                         */}
      {/* ========================================================================= */}
      {viewingActivitiesStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#8A1538] text-white flex items-center justify-center font-black text-xl shadow-md shadow-[#8A1538]/20 shrink-0">
                  {viewingActivitiesStudent.full_name_ar.slice(0, 1)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-lg text-slate-800">
                      {viewingActivitiesStudent.full_name_ar}
                    </h3>
                    <Badge variant={viewingActivitiesStudent.is_active ? "success" : "neutral"}>
                      {viewingActivitiesStudent.is_active ? "نشط" : "مؤرشف"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1">
                    <span>
                      الرقم الأكاديمي:{" "}
                      <strong className="font-mono text-slate-700">
                        {viewingActivitiesStudent.academic_number || "غير محدد"}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      {viewingActivitiesStudent.enrollments[0]?.class_group.grade_level.name_ar || "—"} / الشعبة{" "}
                      {viewingActivitiesStudent.enrollments[0]?.class_group.section.name || "—"}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewingActivitiesStudent(null)}
                className="text-slate-400 hover:text-slate-600 rounded-full h-8 w-8 p-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Activities Stats Overview Bar */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-slate-50 border border-emerald-200/80">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-xs text-emerald-950">
                  إجمالي المشاركات في الأنشطة المدرسية
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-emerald-800">
                  {viewingActivitiesStudent.participations?.length || 0}
                </span>
                <span className="text-xs font-semibold text-emerald-700">مشاركة</span>
              </div>
            </div>

            {/* List of Activities */}
            <div className="space-y-3">
              {(!viewingActivitiesStudent.participations || viewingActivitiesStudent.participations.length === 0) ? (
                <div className="text-center py-10 text-slate-400 space-y-3 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200">
                  <Award className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">
                    لم يشارك هذا الطالب في أي نشاط مسجل حتى الآن.
                  </p>
                  <Link href="/participations">
                    <Button size="sm" variant="primary" className="bg-[#8A1538] hover:bg-[#72112E] text-xs font-bold">
                      <Plus className="w-3.5 h-3.5 ml-1" />
                      <span>تسجيل الطالب في نشاط الآن</span>
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {viewingActivitiesStudent.participations.map((p, pIdx) => {
                    const style = getCategoryBadgeStyle(p.activity.category?.code || "");
                    return (
                      <div
                        key={p.id}
                        className="p-3.5 bg-slate-50/90 hover:bg-slate-100/90 rounded-2xl border border-slate-200 transition-colors flex items-start justify-between gap-4"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-slate-400">
                              #{pIdx + 1}
                            </span>
                            <Link
                              href={`/activities/${p.activity.id}`}
                              className="font-bold text-sm text-slate-900 hover:text-[#8A1538] transition-colors inline-flex items-center gap-1"
                            >
                              <span>{p.activity.name}</span>
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </Link>
                          </div>

                          <div className="flex items-center gap-2.5 text-xs text-slate-500 flex-wrap">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-semibold text-[11px] border ${style.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                              <span>{p.activity.category?.name_ar || "عام"}</span>
                            </span>

                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 font-medium">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{formatArabicDate(p.activity.activity_date)}</span>
                            </span>

                            {p.notes && (
                              <span className="text-[11px] text-slate-500 italic bg-white px-2 py-0.5 rounded border border-slate-100">
                                &ldquo;{p.notes}&rdquo;
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                          {p.activity.status === "COMPLETED" ? "مكتمل" : p.activity.status === "PLANNED" ? "مخطط" : p.activity.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPrintingStudent(viewingActivitiesStudent);
                    setViewingActivitiesStudent(null);
                  }}
                  className="gap-1.5 text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة الكشف</span>
                </Button>

                <Link href={`/students/${viewingActivitiesStudent.id}`}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs font-bold text-[#8A1538] border-[#8A1538]/30 hover:bg-[#8A1538]/5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>الملف الشامل</span>
                  </Button>
                </Link>
              </div>

              <Button
                size="sm"
                variant="primary"
                onClick={() => setViewingActivitiesStudent(null)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold"
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🌟 MODAL 2: Inline Quick Edit Modal                                        */}
      {/* ========================================================================= */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto border border-slate-200 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#8A1538]/10 text-[#8A1538] flex items-center justify-center font-bold">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-800">
                    تعديل بيانات الطالب السريعة
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    تحديث الاسم والأرقام الرسمية والجنسية وحالة القيد
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingStudent(null)}
                className="text-slate-400 hover:text-slate-600 rounded-full h-8 w-8 p-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {quickSaveError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{quickSaveError}</span>
              </div>
            )}

            <form onSubmit={handleSaveQuickEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Full Name Arabic */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    اسم الطالب الكامل بالعربية <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={quickEditForm.full_name_ar}
                    onChange={(e) =>
                      setQuickEditForm({ ...quickEditForm, full_name_ar: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none font-medium"
                  />
                </div>

                {/* Full Name English */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    الاسم بالإنجليزية (اختياري)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={quickEditForm.full_name_en}
                    onChange={(e) =>
                      setQuickEditForm({ ...quickEditForm, full_name_en: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none font-medium"
                  />
                </div>

                {/* Academic Number */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    الرقم الأكاديمي
                  </label>
                  <input
                    type="text"
                    value={quickEditForm.academic_number}
                    onChange={(e) =>
                      setQuickEditForm({ ...quickEditForm, academic_number: e.target.value })
                    }
                    placeholder="مثال: 2026101"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none font-mono"
                  />
                </div>

                {/* Personal Number (QID) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    الرقم الشخصي (QID)
                  </label>
                  <input
                    type="text"
                    value={quickEditForm.personal_number}
                    onChange={(e) =>
                      setQuickEditForm({ ...quickEditForm, personal_number: e.target.value })
                    }
                    placeholder="11 رقماً"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none font-mono"
                  />
                </div>

                {/* Nationality Group */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    فئة الجنسية
                  </label>
                  <select
                    value={quickEditForm.nationality_group}
                    onChange={(e) =>
                      setQuickEditForm({
                        ...quickEditForm,
                        nationality_group: e.target.value as any,
                        nationality: e.target.value === "QATARI" ? "قطري" : quickEditForm.nationality,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none font-semibold text-slate-700"
                  >
                    <option value="">غير محدد</option>
                    <option value="QATARI">قطري</option>
                    <option value="NON_QATARI">غير قطري</option>
                  </select>
                </div>

                {/* Nationality Name */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    اسم الجنسية
                  </label>
                  <input
                    type="text"
                    value={quickEditForm.nationality}
                    onChange={(e) =>
                      setQuickEditForm({ ...quickEditForm, nationality: e.target.value })
                    }
                    placeholder="مثال: قطري، كويتي، مصري..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none font-medium"
                  />
                </div>

                {/* Notes */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">ملاحظات</label>
                  <textarea
                    rows={2}
                    value={quickEditForm.notes}
                    onChange={(e) =>
                      setQuickEditForm({ ...quickEditForm, notes: e.target.value })
                    }
                    placeholder="أي ملاحظات إدارية أو توثيقية خاصة بالطالب..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none resize-none font-medium"
                  />
                </div>

                {/* Active Status */}
                <div className="sm:col-span-2 flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="font-bold text-slate-800 block">حالة القيد في المدرسة</span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      الطلاب النشطون يظهرون في استمارات الأنشطة والتقارير الحالية
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={quickEditForm.is_active}
                      onChange={(e) =>
                        setQuickEditForm({ ...quickEditForm, is_active: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8A1538]"></div>
                  </label>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingStudent(null)}
                  disabled={isQuickSaving}
                  className="font-bold text-xs"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={isQuickSaving}
                  className="bg-[#8A1538] hover:bg-[#72112E] text-white font-bold text-xs gap-1.5 shadow-xs"
                >
                  {isQuickSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>جارٍ الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>حفظ التعديلات</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🌟 MODAL 3: Official Student Statement / Printable Record Card            */}
      {/* ========================================================================= */}
      {printingStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-6 max-h-[92vh] overflow-y-auto border border-slate-200 shadow-2xl">
            {/* Top action bar (Screen only) */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 print:hidden">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#8A1538]/10 text-[#8A1538] flex items-center justify-center">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-800">
                    كشف بيان مشاركات الطالب في الأنشطة المدرسية
                  </h3>
                  <p className="text-xs text-slate-400">
                    معاينة الوثيقة الرسمية الصادرة من نظام الأنشطة المدرسية
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-[#8A1538] hover:bg-[#72112E] text-white font-bold gap-1.5 shadow-xs text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة المستند الآن</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPrintingStudent(null)}
                  className="text-slate-400 hover:text-slate-600 rounded-full h-8 w-8 p-0"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Printable Document Container */}
            <div className="p-4 sm:p-6 bg-white space-y-6 border border-slate-100 rounded-2xl">
              <OfficialPrintHeader
                schoolName={schoolName}
                academicYearName={academicYearName}
                reportTitle="إفادة مشاركات طالب في الأنشطة المدرسية"
                subtitle={`قسم الأنشطة والبرامج الطلابية المدرسية — ${schoolName}`}
              />

              {/* Student Metadata Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold">اسم الطالب:</span>
                  <span className="font-black text-slate-900 text-sm">{printingStudent.full_name_ar}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">الرقم الأكاديمي:</span>
                  <span className="font-mono font-bold text-slate-800">{printingStudent.academic_number || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">الصف والشعبة:</span>
                  <span className="font-bold text-slate-800">
                    {printingStudent.enrollments[0]?.class_group.grade_level.name_ar || "—"} / الشعبة{" "}
                    {printingStudent.enrollments[0]?.class_group.section.name || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">الجنسية:</span>
                  <span className="font-bold text-slate-800">
                    {printingStudent.nationality_group === "QATARI"
                      ? "قطري"
                      : printingStudent.nationality || "غير قطري"}
                  </span>
                </div>
              </div>

              {/* Table of Participated Activities */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>سجل الأنشطة والفعاليات المنفذة:</span>
                  <span className="font-mono">
                    إجمالي المشاركات: {printingStudent.participations?.length || 0}
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#8A1538] text-white font-bold">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">م</th>
                        <th className="py-2.5 px-3">اسم الفعالية / النشاط</th>
                        <th className="py-2.5 px-3">تصنيف النشاط</th>
                        <th className="py-2.5 px-3 text-center">تاريخ النشاط</th>
                        <th className="py-2.5 px-3 text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(!printingStudent.participations || printingStudent.participations.length === 0) ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                            لا توجد مشاركات مسجلة للطالب في العام الدراسي الحالي
                          </td>
                        </tr>
                      ) : (
                        printingStudent.participations.map((p, idx) => (
                          <tr key={p.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-bold">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-800">
                              {p.activity.name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {p.activity.category?.name_ar || "عام"}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                              {formatArabicDate(p.activity.activity_date)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {p.activity.status === "COMPLETED" ? "مكتمل" : p.activity.status === "PLANNED" ? "مخطط" : p.activity.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <OfficialPrintFooter />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
