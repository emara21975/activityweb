"use client";

import React, { useState, useTransition, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/ui/PrintButton";
import { OfficialPrintHeader } from "@/components/reports/OfficialPrintHeader";
import { OfficialPrintFooter } from "@/components/reports/OfficialPrintFooter";
import {
  CalendarDays,
  Plus,
  Search,
  UserCheck,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  RotateCcw,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Flag,
  Globe,
  Sparkles,
  Eye,
  Pencil,
  MoreHorizontal,
  Printer,
  FileText,
  Paperclip,
  Image as ImageIcon,
  UserPlus,
  ArrowUpRight,
  Archive,
  Award,
  Check,
  ChevronDown,
  Info,
} from "lucide-react";
import {
  quickUpdateActivityAction,
  toggleActivityStatusAction,
  archiveActivityAction,
} from "@/app/actions/activity-actions";
import { CategoriesManagerModal } from "./CategoriesManagerModal";
import { CategoryWithCount } from "@/lib/services/category-service";

export interface ActivityParticipantItem {
  id: string;
  studentId: string;
  studentName: string;
  academicNumber?: string | null;
  nationalityGroup?: string | null;
  nationality?: string | null;
  gradeName: string;
  sectionName: string;
  notes?: string | null;
}

export interface ActivityItem {
  id: string;
  name: string;
  activity_date: Date | string;
  status: string;
  notes?: string | null;
  category: {
    id: string;
    code: string;
    name_ar: string;
  };
  academic_year: {
    id: string;
    name: string;
  };
  attachmentsCount: number;
  totalParticipants: number;
  qatariCount: number;
  nonQatariCount: number;
  participations: ActivityParticipantItem[];
}

export interface ActivitiesRegistryViewProps {
  activities: ActivityItem[];
  academicYears: Array<{ id: string; name: string; is_current: boolean }>;
  categories: CategoryWithCount[];
  selectedYearId: string;
  schoolName: string;
  academicYearName: string;
  canManageCategories?: boolean;
  /** Show the link to the activity assignment screen (activity.view_all) */
  canAssign?: boolean;
  initialFilters: {
    yearId?: string;
    categoryId?: string;
    status?: string;
    search?: string;
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
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(dateVal);
  }
}

function formatShortDate(dateVal?: Date | string | null) {
  if (!dateVal) return "—";
  try {
    const d = new Date(dateVal);
    return d.toLocaleDateString("ar-QA", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(dateVal);
  }
}

function getActivityDisplayNotes(rawNotes?: string | null): {
  displayText: string;
  department?: string;
  targetGroup?: string;
  isReport: boolean;
} {
  if (!rawNotes || !rawNotes.trim()) {
    return { displayText: "", isReport: false };
  }

  const trimmed = rawNotes.trim();
  if (trimmed.startsWith("{")) {
    try {
      const data = JSON.parse(trimmed);
      const displayText = data.objectives || data.recommendations || data.execution_steps || data.raw_notes || "";
      const department = data.responsible_department || "";
      const targetGroup = data.target_group || "";
      return {
        displayText: typeof displayText === "string" ? displayText.trim() : "",
        department: typeof department === "string" ? department.trim() : "",
        targetGroup: typeof targetGroup === "string" ? targetGroup.trim() : "",
        isReport: true,
      };
    } catch {
      return { displayText: trimmed, isReport: false };
    }
  }

  return { displayText: trimmed, isReport: false };
}


export function ActivitiesRegistryView({
  activities,
  academicYears,
  categories,
  selectedYearId,
  schoolName,
  academicYearName,
  canManageCategories = true,
  canAssign = false,
  initialFilters,
}: ActivitiesRegistryViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Controlled Filter States
  const [searchValue, setSearchValue] = useState(initialFilters.search || "");
  const [selectedYear, setSelectedYear] = useState(initialFilters.yearId || selectedYearId || "");
  const [selectedCategory, setSelectedCategory] = useState(initialFilters.categoryId || "");
  const [selectedStatus, setSelectedStatus] = useState(initialFilters.status || "");

  // Interactive Modals and Actions State
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [viewingParticipantsActivity, setViewingParticipantsActivity] = useState<ActivityItem | null>(null);
  const [editingActivity, setEditingActivity] = useState<ActivityItem | null>(null);
  const [archivingActivity, setArchivingActivity] = useState<ActivityItem | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [isSavingQuickEdit, setIsSavingQuickEdit] = useState(false);
  const [quickEditError, setQuickEditError] = useState<string | null>(null);
  const [isTogglingStatusId, setIsTogglingStatusId] = useState<string | null>(null);
  const [participantSearch, setParticipantSearch] = useState("");

  // Quick edit form state
  const [quickEditForm, setQuickEditForm] = useState({
    name: "",
    category_id: "",
    activity_date: "",
    status: "COMPLETED" as "PLANNED" | "COMPLETED" | "CANCELLED",
    notes: "",
  });

  // Sync state if props change
  useEffect(() => {
    setSearchValue(initialFilters.search || "");
    setSelectedYear(initialFilters.yearId || selectedYearId || "");
    setSelectedCategory(initialFilters.categoryId || "");
    setSelectedStatus(initialFilters.status || "");
  }, [initialFilters.search, initialFilters.yearId, initialFilters.categoryId, initialFilters.status, selectedYearId]);

  // Click outside listener for action dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".activity-action-menu-container")) {
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
      yearId?: string;
      categoryId?: string;
      status?: string;
    }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (newFilters.search !== undefined) {
        if (newFilters.search.trim()) {
          params.set("search", newFilters.search.trim());
        } else {
          params.delete("search");
        }
      }

      if (newFilters.yearId !== undefined) {
        if (newFilters.yearId) {
          params.set("yearId", newFilters.yearId);
        } else {
          params.delete("yearId");
        }
      }

      if (newFilters.categoryId !== undefined) {
        if (newFilters.categoryId) {
          params.set("categoryId", newFilters.categoryId);
        } else {
          params.delete("categoryId");
        }
      }

      if (newFilters.status !== undefined) {
        if (newFilters.status) {
          params.set("status", newFilters.status);
        } else {
          params.delete("status");
        }
      }

      const query = params.toString() ? `?${params.toString()}` : "";
      startTransition(() => {
        router.replace(`${pathname}${query}`, { scroll: false });
      });
    },
    [router, pathname, searchParams]
  );

  // Debounce search changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== (initialFilters.search || "")) {
        applyFilters({ search: searchValue });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, initialFilters.search, applyFilters]);

  // Direct handlers
  const handleYearChange = (val: string) => {
    setSelectedYear(val);
    applyFilters({ yearId: val });
  };

  const handleCategoryChange = (val: string) => {
    setSelectedCategory(val);
    applyFilters({ categoryId: val });
  };

  const handleStatusChange = (val: string) => {
    setSelectedStatus(val);
    applyFilters({ status: val });
  };

  const handleResetFilters = () => {
    setSearchValue("");
    setSelectedCategory("");
    setSelectedStatus("");
    const params = new URLSearchParams();
    if (selectedYear) {
      params.set("yearId", selectedYear);
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    startTransition(() => {
      router.replace(`${pathname}${query}`, { scroll: false });
    });
  };

  const hasActiveFilters = Boolean(
    searchValue || selectedCategory || selectedStatus
  );

  // Computed Statistics (KPI Metrics) across current filtered activities
  const stats = useMemo(() => {
    const total = activities.length;
    const completed = activities.filter((a) => a.status === "COMPLETED").length;
    const planned = activities.filter((a) => a.status === "PLANNED").length;
    const cancelled = activities.filter((a) => a.status === "CANCELLED").length;

    const totalParticipants = activities.reduce((sum, a) => sum + a.totalParticipants, 0);
    const totalQatari = activities.reduce((sum, a) => sum + a.qatariCount, 0);
    const totalNonQatari = activities.reduce((sum, a) => sum + a.nonQatariCount, 0);

    const qatariPercentage = totalParticipants > 0 ? Math.round((totalQatari / totalParticipants) * 100) : 0;
    const nonQatariPercentage = totalParticipants > 0 ? Math.round((totalNonQatari / totalParticipants) * 100) : 0;
    const completedPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const avgParticipantsPerAct = total > 0 ? Math.round(totalParticipants / total) : 0;

    // Category distribution counts
    const categoryCounts: Record<string, number> = {};
    activities.forEach((act) => {
      categoryCounts[act.category.id] = (categoryCounts[act.category.id] || 0) + 1;
    });

    return {
      total,
      completed,
      planned,
      cancelled,
      totalParticipants,
      totalQatari,
      totalNonQatari,
      qatariPercentage,
      nonQatariPercentage,
      completedPercentage,
      avgParticipantsPerAct,
      categoryCounts,
    };
  }, [activities]);

  // Open Quick Edit Modal
  const handleOpenEdit = (act: ActivityItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingActivity(act);
    const dateFormatted = new Date(act.activity_date).toISOString().split("T")[0];
    const parsedNotes = getActivityDisplayNotes(act.notes);
    setQuickEditForm({
      name: act.name,
      category_id: act.category.id,
      activity_date: dateFormatted,
      status: (act.status as any) || "COMPLETED",
      notes: parsedNotes.displayText || (parsedNotes.isReport ? "" : act.notes || ""),
    });
    setQuickEditError(null);
    setActiveDropdownId(null);
  };

  // Submit Quick Edit
  const handleSaveQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity) return;
    if (!quickEditForm.name.trim()) {
      setQuickEditError("اسم النشاط مطلوب");
      return;
    }

    try {
      setIsSavingQuickEdit(true);
      setQuickEditError(null);
      await quickUpdateActivityAction(editingActivity.id, {
        name: quickEditForm.name.trim(),
        category_id: quickEditForm.category_id,
        activity_date: quickEditForm.activity_date,
        status: quickEditForm.status,
        notes: quickEditForm.notes.trim() || null,
      });
      setEditingActivity(null);
      router.refresh();
    } catch (err: any) {
      setQuickEditError(err?.message || "حدث خطأ أثناء تعديل بيانات النشاط");
    } finally {
      setIsSavingQuickEdit(false);
    }
  };

  // Fast Status Toggle (Completed <-> Planned)
  const handleToggleStatus = async (act: ActivityItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextStatus = act.status === "COMPLETED" ? "PLANNED" : "COMPLETED";
    try {
      setIsTogglingStatusId(act.id);
      await toggleActivityStatusAction(act.id, nextStatus);
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "حدث خطأ أثناء تغيير حالة النشاط");
    } finally {
      setIsTogglingStatusId(null);
      setActiveDropdownId(null);
    }
  };

  // Archive Activity
  const handleConfirmArchive = async () => {
    if (!archivingActivity) return;
    try {
      await archiveActivityAction(archivingActivity.id);
      setArchivingActivity(null);
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "حدث خطأ أثناء أرشفة النشاط");
    }
  };

  // Filtered Participants in Participant Modal
  const filteredParticipants = useMemo(() => {
    if (!viewingParticipantsActivity) return [];
    if (!participantSearch.trim()) return viewingParticipantsActivity.participations;
    const q = participantSearch.trim().toLowerCase();
    return viewingParticipantsActivity.participations.filter(
      (p) =>
        p.studentName.toLowerCase().includes(q) ||
        (p.academicNumber && p.academicNumber.includes(q)) ||
        p.gradeName.includes(q) ||
        p.sectionName.includes(q)
    );
  }, [viewingParticipantsActivity, participantSearch]);

  return (
    <div className="space-y-6">
      {/* Official Print Header (Strictly for Printing & PDF Export) */}
      <div className="hidden print:block">
        <OfficialPrintHeader
          schoolName={schoolName}
          academicYearName={academicYearName}
          reportTitle="سجل الأنشطة والفعاليات المدرسية المنفذة"
          subtitle={`العام الدراسي ${academicYearName} • كشف توثيق الأنشطة المدرسية`}
        />
      </div>

      {/* Screen Only Unified Modern Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">الأنشطة المدرسية</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#8A1538]/10 text-[#8A1538] border border-[#8A1538]/20">
                {stats.total} نشاط مسجل
              </span>
              {isPending && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>تحديث فوري...</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              إدارة وتوثيق الفعاليات المدرسية ومتابعة نسب الإنجاز والمشاركات الطلابية — {schoolName}
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <PrintButton
              label="طباعة السجل (PDF)"
              variant="outline"
              size="sm"
              className="gap-1.5 font-bold border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            />

            <Button
              onClick={() => setIsCategoriesModalOpen(true)}
              size="sm"
              variant="outline"
              className="gap-1.5 font-bold border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
            >
              <Layers className="w-4 h-4 text-[#8A1538]" />
              <span>إدارة التصنيفات</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono">
                {categories.length}
              </span>
            </Button>

            {canAssign && (
              <Link href="/activities/assign">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 font-bold border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
                >
                  <UserCheck className="w-4 h-4 text-[#8A1538]" />
                  <span>توزيع الأنشطة على المستخدمين</span>
                </Button>
              </Link>
            )}

            <Link href="/participations">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 font-bold border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 shadow-2xs"
              >
                <UserCheck className="w-4 h-4 text-amber-700" />
                <span>تسجيل مشاركة</span>
              </Button>
            </Link>

            <Link href="/activities/new">
              <Button
                size="sm"
                variant="primary"
                className="gap-1.5 font-bold shadow-xs bg-[#8A1538] hover:bg-[#72112E] text-white"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة نشاط جديد</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 🌟 STATS CARDS: High-Impact KPI Metrics with Click-to-Filter */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 transition-opacity duration-200 print:grid-cols-5 ${
          isPending ? "opacity-60" : "opacity-100"
        }`}
      >
        {/* Card 1: Total Activities */}
        <Card
          onClick={() => handleStatusChange("")}
          className={`p-4 bg-white cursor-pointer transition-all duration-150 hover:shadow-md select-none border-2 ${
            selectedStatus === "" && !hasActiveFilters
              ? "border-slate-800 shadow-xs"
              : "border-slate-200 hover:border-slate-300"
          }`}
          title="عرض كل الأنشطة بدون تصفية حالة"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">إجمالي الأنشطة</span>
            <CalendarDays className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-2xl font-black text-slate-800">{stats.total}</p>
            <span className="text-[11px] text-slate-400 font-medium">فعالية مسجلة</span>
          </div>
          <div className="mt-2 text-[10.5px] text-slate-400 font-medium truncate">
            العام الدراسي: {academicYearName}
          </div>
        </Card>

        {/* Card 2: Completed Activities */}
        <Card
          onClick={() => handleStatusChange(selectedStatus === "COMPLETED" ? "" : "COMPLETED")}
          className={`p-4 bg-white cursor-pointer transition-all duration-150 hover:shadow-md select-none border-2 ${
            selectedStatus === "COMPLETED"
              ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-400/20 shadow-xs"
              : "border-slate-200 hover:border-emerald-400 border-r-4 border-r-emerald-500"
          }`}
          title="اضغط لتصفية الأنشطة المنفذة فقط"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">الأنشطة المنفذة</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-2xl font-black text-emerald-800">{stats.completed}</p>
            {stats.total > 0 && (
              <span className="text-[11px] font-bold text-emerald-700 font-mono">
                {stats.completedPercentage}%
              </span>
            )}
          </div>
          <div className="mt-2 text-[10.5px] text-emerald-700/80 font-medium">
            تم تنفيذها وتوثيقها بالكامل
          </div>
        </Card>

        {/* Card 3: Planned Activities */}
        <Card
          onClick={() => handleStatusChange(selectedStatus === "PLANNED" ? "" : "PLANNED")}
          className={`p-4 bg-white cursor-pointer transition-all duration-150 hover:shadow-md select-none border-2 ${
            selectedStatus === "PLANNED"
              ? "border-amber-500 bg-amber-50/50 ring-2 ring-amber-400/20 shadow-xs"
              : "border-slate-200 hover:border-amber-400 border-r-4 border-r-amber-500"
          }`}
          title="اضغط لتصفية الأنشطة المخططة فقط"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800">الأنشطة المخططة</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-2xl font-black text-amber-800">{stats.planned}</p>
            <span className="text-[10px] text-amber-700 font-medium">قيد التنفيذ</span>
          </div>
          <div className="mt-2 text-[10.5px] text-amber-700/80 font-medium">
            بانتظار استكمال التوثيق
          </div>
        </Card>

        {/* Card 4: Total Student Participations */}
        <Card className="p-4 bg-white border-2 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">المشاركات الطلابية</span>
            <Users className="w-4 h-4 text-[#8A1538]" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <p className="text-2xl font-black text-[#8A1538]">{stats.totalParticipants}</p>
            <span className="text-[10px] text-slate-400 font-medium">مشاركة</span>
          </div>
          <div className="mt-2 text-[10.5px] text-slate-500 font-medium">
            معدل <strong className="text-slate-700">{stats.avgParticipantsPerAct}</strong> طالب / نشاط
          </div>
        </Card>

        {/* Card 5: Nationality Breakdown */}
        <Card className="p-4 bg-white border-2 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">توزيع الجنسيات</span>
            <Flag className="w-4 h-4 text-[#8A1538]" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div className="flex items-baseline gap-1.5 font-bold">
              <span className="text-base text-[#8A1538] font-black">{stats.totalQatari}</span>
              <span className="text-[10px] text-slate-400">قطري</span>
              <span className="text-slate-300">/</span>
              <span className="text-sm text-slate-700 font-bold">{stats.totalNonQatari}</span>
              <span className="text-[10px] text-slate-400">غير قطري</span>
            </div>
            {stats.totalParticipants > 0 && (
              <span className="text-[11px] font-bold text-[#8A1538] font-mono">
                {stats.qatariPercentage}%
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div className="mt-2.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
            <div
              className="bg-[#8A1538] h-full transition-all duration-300"
              style={{ width: `${stats.qatariPercentage}%` }}
              title={`نسبة القطريين: ${stats.qatariPercentage}%`}
            />
            <div
              className="bg-slate-400 h-full transition-all duration-300"
              style={{ width: `${stats.nonQatariPercentage}%` }}
              title={`نسبة غير القطريين: ${stats.nonQatariPercentage}%`}
            />
          </div>
        </Card>
      </div>

      {/* 🌟 FILTERS CARD: Instant Debounced Search & Dropdown Controls */}
      <Card className="p-4 bg-white border border-slate-200 shadow-2xs print:hidden space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="البحث الفوري باسم النشاط أو الملاحظات..."
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

          {/* Academic Year Filter */}
          <div>
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:border-transparent focus:outline-none font-semibold text-slate-700 transition-all cursor-pointer"
            >
              <option value="">جميع السنوات الدراسية</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.is_current ? "— العام الحالي" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:border-transparent focus:outline-none font-semibold text-slate-700 transition-all cursor-pointer"
            >
              <option value="">جميع تصنيفات الأنشطة</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_ar} {stats.categoryCounts[c.id] ? `(${stats.categoryCounts[c.id]})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter & Reset */}
          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:border-transparent focus:outline-none font-semibold text-slate-700 transition-all cursor-pointer"
            >
              <option value="">كل الحالات</option>
              <option value="COMPLETED">منفذ فقط</option>
              <option value="PLANNED">مخطط فقط</option>
              <option value="CANCELLED">ملغي</option>
            </select>

            {hasActiveFilters && (
              <Button
                type="button"
                onClick={handleResetFilters}
                size="sm"
                variant="outline"
                className="px-2.5 h-8 text-xs font-bold text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors shrink-0"
                title="إعادة ضبط الفلاتر"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">تفريغ</span>
              </Button>
            )}
          </div>
        </div>

        {/* Quick Category Chips Strip */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-xs">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 ml-1">
            تصنيف سريع:
          </span>
          <button
            type="button"
            onClick={() => handleCategoryChange("")}
            className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors shrink-0 cursor-pointer ${
              selectedCategory === ""
                ? "bg-[#8A1538] text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            الكل ({activities.length})
          </button>
          {categories.map((c) => {
            const count = stats.categoryCounts[c.id] || 0;
            const isSelected = selectedCategory === c.id;
            const style = getCategoryBadgeStyle(c.code);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleCategoryChange(isSelected ? "" : c.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all shrink-0 cursor-pointer border ${
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                    : `${style.badge} hover:bg-slate-200 hover:border-slate-300 text-slate-700`
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : style.dot}`} />
                <span>{c.name_ar}</span>
                {count > 0 && (
                  <span
                    className={`px-1 rounded text-[10px] font-bold ${
                      isSelected ? "bg-white/20 text-white" : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Filters Pill Bar */}
        {hasActiveFilters && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700 inline-flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-[#8A1538]" />
                <span>الفلاتر النشطة:</span>
              </span>

              {searchValue && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                  بحث: {searchValue}
                  <button onClick={() => applyFilters({ search: "" })} className="hover:text-rose-600 cursor-pointer">
                    ×
                  </button>
                </span>
              )}

              {selectedCategory && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#8A1538]/10 text-[#8A1538] font-bold text-[11px]">
                  {categories.find((c) => c.id === selectedCategory)?.name_ar}
                  <button onClick={() => applyFilters({ categoryId: "" })} className="hover:text-rose-600 cursor-pointer">
                    ×
                  </button>
                </span>
              )}

              {selectedStatus && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                  الحالة: {selectedStatus === "COMPLETED" ? "منفذ" : selectedStatus === "PLANNED" ? "مخطط" : "ملغي"}
                  <button onClick={() => applyFilters({ status: "" })} className="hover:text-rose-600 cursor-pointer">
                    ×
                  </button>
                </span>
              )}
            </div>

            <button
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-[#8A1538] hover:underline cursor-pointer"
            >
              مسح الفلاتر
            </button>
          </div>
        )}
      </Card>

      {/* 🌟 ACTIVITIES TABLE */}
      <Card
        className={`p-0 overflow-hidden bg-white border border-slate-200 shadow-2xs transition-opacity duration-200 ${
          isPending ? "opacity-60 pointer-events-none" : "opacity-100"
        }`}
      >
        {activities.length === 0 ? (
          <div className="text-center py-16 text-slate-400 space-y-3">
            <CalendarDays className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-600">
              لم يتم العثور على أنشطة مطابقة لمعايير البحث الحالية.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              {hasActiveFilters && (
                <Button size="sm" variant="outline" onClick={handleResetFilters}>
                  إلغاء الفلاتر وعرض الكل
                </Button>
              )}
              <Link href="/activities/new">
                <Button size="sm" variant="primary" className="bg-[#8A1538] hover:bg-[#72112E]">
                  إنشاء نشاط جديد
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">م</th>
                  <th className="py-3.5 px-4 min-w-[130px]">تاريخ النشاط</th>
                  <th className="py-3.5 px-4 min-w-[220px]">اسم الفعالية / النشاط</th>
                  <th className="py-3.5 px-4 min-w-[150px]">التصنيف الرئيسي</th>
                  <th className="py-3.5 px-4 text-center">العام الدراسي</th>
                  <th className="py-3.5 px-4 text-center min-w-[190px]">
                    المشاركون وتوزيع الجنسيات
                  </th>
                  <th className="py-3.5 px-4 text-center">الحالة</th>
                  <th className="py-3.5 px-4 text-center min-w-[160px] print:hidden">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {activities.map((act, idx) => {
                  const isDropdownOpen = activeDropdownId === act.id;
                  const isTogglingStatus = isTogglingStatusId === act.id;
                  const catStyle = getCategoryBadgeStyle(act.category.code);
                  const isCompleted = act.status === "COMPLETED";
                  const isPlanned = act.status === "PLANNED";

                  return (
                    <tr
                      key={act.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Serial Number */}
                      <td className="py-3.5 px-4 text-center text-slate-400 font-mono font-bold">
                        {idx + 1}
                      </td>

                      {/* Activity Date */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800 block text-xs">
                            {formatArabicDate(act.activity_date)}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400 block" dir="ltr">
                            {new Date(act.activity_date).toISOString().split("T")[0]}
                          </span>
                        </div>
                      </td>

                      {/* Activity Name & Attachments Indicator */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                              href={`/activities/${act.id}`}
                              className="font-bold text-slate-900 hover:text-[#8A1538] transition-colors text-xs"
                            >
                              {act.name}
                            </Link>

                            {act.attachmentsCount > 0 && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
                                title={`يحتوي على ${act.attachmentsCount} ملفات/صور مرفقة`}
                              >
                                <Paperclip className="w-3 h-3" />
                                <span>{act.attachmentsCount}</span>
                              </span>
                            )}
                          </div>

                          {(() => {
                            const displayNotes = getActivityDisplayNotes(act.notes);
                            if (!displayNotes.displayText && !displayNotes.department) return null;
                            return (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-normal mt-0.5">
                                {displayNotes.department && (
                                  <span className="shrink-0 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px] border border-slate-200">
                                    {displayNotes.department}
                                  </span>
                                )}
                                {displayNotes.displayText && (
                                  <span className="truncate max-w-[280px] text-slate-500" title={displayNotes.displayText}>
                                    {displayNotes.displayText}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Main Category */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${catStyle.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${catStyle.dot}`} />
                          <span className="truncate max-w-[140px]">{act.category.name_ar}</span>
                        </span>
                      </td>

                      {/* Academic Year */}
                      <td className="py-3.5 px-4 text-center text-slate-600 font-semibold text-xs">
                        {act.academic_year.name}
                      </td>

                      {/* Participants & Nationality Breakdown */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          {act.totalParticipants > 0 ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setViewingParticipantsActivity(act)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors cursor-pointer group/part"
                                title="انقر لعرض أسماء الطلاب المشاركين"
                              >
                                <Users className="w-3.5 h-3.5 text-[#8A1538]" />
                                <span>{act.totalParticipants} طالب</span>
                                <ChevronLeft className="w-3 h-3 text-slate-400 group-hover/part:-translate-x-0.5 transition-transform" />
                              </button>

                              {/* Qatari vs Non-Qatari Mini Breakdown */}
                              <div className="flex items-center gap-1.5 text-[10.5px] font-bold">
                                <span className="text-[#8A1538] inline-flex items-center gap-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#8A1538]" />
                                  <span>{act.qatariCount} قطري</span>
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-600 inline-flex items-center gap-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  <span>{act.nonQatariCount} غير قطري</span>
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="inline-block text-[11px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                                لا يوجد مشاركون
                              </span>
                              <Link
                                href={`/participations?activityId=${act.id}`}
                                className="block text-[10px] text-[#8A1538] font-bold hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                + تسجيل طلاب
                              </Link>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Activity Status */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => handleToggleStatus(act, e)}
                          disabled={isTogglingStatus}
                          className="inline-block cursor-pointer transition-transform hover:scale-105"
                          title="انقر للتبديل السريع بين (منفذ) و (مخطط)"
                        >
                          <Badge
                            variant={
                              isCompleted ? "success" : isPlanned ? "warning" : "danger"
                            }
                            className="gap-1 cursor-pointer"
                          >
                            {isTogglingStatus ? (
                              <Loader2 className="w-3 h-3 animate-spin inline-block" />
                            ) : isCompleted ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            ) : isPlanned ? (
                              <Clock className="w-3 h-3 text-amber-700" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-rose-700" />
                            )}
                            <span>{isCompleted ? "منفذ" : isPlanned ? "مخطط" : "ملغي"}</span>
                          </Badge>
                        </button>
                      </td>

                      {/* Action Center */}
                      <td className="py-3.5 px-4 text-center print:hidden">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Primary: Activity Profile / Details */}
                          <Link href={`/activities/${act.id}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2.5 text-xs font-bold gap-1 text-slate-700 hover:text-white hover:bg-[#8A1538] hover:border-[#8A1538] shadow-2xs transition-colors rounded-lg"
                              title="عرض التقرير الرسمي والتوثيق الكامل"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>التقرير</span>
                            </Button>
                          </Link>

                          {/* Quick Action: Register Students */}
                          <Link href={`/participations?activityId=${act.id}`}>
                            <button
                              type="button"
                              className="h-8 w-8 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                              title="تسجيل طلاب جدد في هذا النشاط"
                            >
                              <UserPlus className="w-3.5 h-3.5 text-amber-700" />
                            </button>
                          </Link>

                          {/* Quick Action: Participants Modal */}
                          {act.totalParticipants > 0 && (
                            <button
                              type="button"
                              onClick={() => setViewingParticipantsActivity(act)}
                              className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                              title="استعراض أسماء الطلاب المشاركين"
                            >
                              <Users className="w-3.5 h-3.5 text-slate-600" />
                            </button>
                          )}

                          {/* Quick Action: Quick Edit */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(act, e)}
                            className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                            title="تعديل سريع لبيانات النشاط"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* More Options Dropdown */}
                          <div className="relative activity-action-menu-container">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(isDropdownOpen ? null : act.id);
                              }}
                              className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors shadow-2xs cursor-pointer ${
                                isDropdownOpen
                                  ? "bg-[#8A1538] text-white border-[#8A1538]"
                                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                              }`}
                              title="المزيد من الإجراءات"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {/* Floating Dropdown Menu */}
                            {isDropdownOpen && (
                              <div
                                className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 text-right text-xs divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="p-1 space-y-0.5">
                                  <Link
                                    href={`/activities/${act.id}`}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-[#8A1538] rounded-xl font-semibold transition-colors"
                                    onClick={() => setActiveDropdownId(null)}
                                  >
                                    <FileText className="w-4 h-4 text-slate-400" />
                                    <span>تقرير وتوثيق النشاط الكامل</span>
                                  </Link>

                                  <Link
                                    href={`/participations?activityId=${act.id}`}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-amber-800 rounded-xl font-semibold transition-colors"
                                    onClick={() => setActiveDropdownId(null)}
                                  >
                                    <UserPlus className="w-4 h-4 text-amber-600" />
                                    <span>تسجيل وإدارة مشاركات الطلاب</span>
                                  </Link>

                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenEdit(act, e)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-[#8A1538] rounded-xl font-semibold transition-colors cursor-pointer"
                                  >
                                    <Pencil className="w-4 h-4 text-slate-400" />
                                    <span>تعديل سريع للبيانات</span>
                                  </button>
                                </div>

                                <div className="p-1 space-y-0.5">
                                  <button
                                    type="button"
                                    onClick={(e) => handleToggleStatus(act, e)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold transition-colors cursor-pointer"
                                  >
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    <span>
                                      تحويل إلى نشاط {isCompleted ? "مخطط" : "منفذ"}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setArchivingActivity(act);
                                      setActiveDropdownId(null);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-semibold transition-colors cursor-pointer"
                                  >
                                    <Archive className="w-4 h-4" />
                                    <span>أرشفة هذا النشاط</span>
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
        )}
      </Card>

      {/* Official Signatures & Stamp Footer (Strictly for Printing & PDF Export) */}
      <div className="hidden print:block mt-8">
        <OfficialPrintFooter />
      </div>

      {/* ========================================================================= */}
      {/* 🌟 MODAL 1: Participants Preview Modal                                    */}
      {/* ========================================================================= */}
      {viewingParticipantsActivity && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-lg text-slate-800">
                    الطلاب المشاركون في نشاط: {viewingParticipantsActivity.name}
                  </h3>
                  <Badge variant={viewingParticipantsActivity.status === "COMPLETED" ? "success" : "warning"}>
                    {viewingParticipantsActivity.status === "COMPLETED" ? "منفذ" : "مخطط"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  التصنيف: {viewingParticipantsActivity.category.name_ar} • التاريخ: {formatArabicDate(viewingParticipantsActivity.activity_date)}
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setViewingParticipantsActivity(null);
                  setParticipantSearch("");
                }}
                className="text-slate-400 hover:text-slate-600 rounded-full h-8 w-8 p-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-center font-bold">
              <div>
                <span className="text-slate-400 block text-[11px]">إجمالي المشاركين</span>
                <span className="text-lg text-slate-800 font-black">
                  {viewingParticipantsActivity.totalParticipants}
                </span>
              </div>
              <div className="border-r border-l border-slate-200">
                <span className="text-[#8A1538] block text-[11px]">الطلاب القطريون</span>
                <span className="text-lg text-[#8A1538] font-black">
                  {viewingParticipantsActivity.qatariCount}
                </span>
              </div>
              <div>
                <span className="text-slate-600 block text-[11px]">الطلاب غير القطريين</span>
                <span className="text-lg text-slate-700 font-black">
                  {viewingParticipantsActivity.nonQatariCount}
                </span>
              </div>
            </div>

            {/* Filter Search inside Modal */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
                placeholder="بحث بين الطلاب المشاركين بالاسم أو الصف..."
                className="w-full pr-8 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
              />
            </div>

            {/* Participants Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">م</th>
                    <th className="py-2.5 px-3">الرقم الأكاديمي</th>
                    <th className="py-2.5 px-3">اسم الطالب</th>
                    <th className="py-2.5 px-3">الصف والشعبة</th>
                    <th className="py-2.5 px-3 text-center">الجنسية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredParticipants.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        لم يتم العثور على مشاركين مطابقين.
                      </td>
                    </tr>
                  ) : (
                    filteredParticipants.map((p, pIdx) => (
                      <tr key={p.id} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 text-center font-mono text-slate-400">
                          {pIdx + 1}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-700">
                          {p.academicNumber || "—"}
                        </td>
                        <td className="py-2 px-3">
                          <Link
                            href={`/students/${p.studentId}`}
                            className="font-bold text-slate-900 hover:text-[#8A1538]"
                          >
                            {p.studentName}
                          </Link>
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {p.gradeName} / {p.sectionName}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {p.nationalityGroup === "QATARI" ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#8A1538]/10 text-[#8A1538]">
                              قطري
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {p.nationality || "غير قطري"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <Link href={`/participations?activityId=${viewingParticipantsActivity.id}`}>
                <Button size="sm" variant="gold" className="text-xs font-bold gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>تسجيل طلاب إضافيين في هذا النشاط</span>
                </Button>
              </Link>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setViewingParticipantsActivity(null);
                  setParticipantSearch("");
                }}
                className="text-xs font-bold"
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🌟 MODAL 2: Quick Edit Activity Modal                                     */}
      {/* ========================================================================= */}
      {editingActivity && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto border border-slate-200 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#8A1538]/10 text-[#8A1538] flex items-center justify-center font-bold">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-800">
                    تعديل بيانات النشاط السريعة
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    تحديث الاسم والتاريخ والتصنيف والحالة والملاحظات
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingActivity(null)}
                className="text-slate-400 hover:text-slate-600 rounded-full h-8 w-8 p-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {quickEditError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{quickEditError}</span>
              </div>
            )}

            <form onSubmit={handleSaveQuickEdit} className="space-y-4 text-xs">
              {/* Activity Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  اسم الفعالية / النشاط <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={quickEditForm.name}
                  onChange={(e) =>
                    setQuickEditForm({ ...quickEditForm, name: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Category */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    التصنيف الرئيسي <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={quickEditForm.category_id}
                    onChange={(e) =>
                      setQuickEditForm({ ...quickEditForm, category_id: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none font-semibold text-slate-700"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name_ar}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Activity Date */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    تاريخ النشاط <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={quickEditForm.activity_date}
                    onChange={(e) =>
                      setQuickEditForm({ ...quickEditForm, activity_date: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none font-medium font-mono"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  حالة النشاط
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickEditForm({ ...quickEditForm, status: "COMPLETED" })}
                    className={`py-2 px-3 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all ${
                      quickEditForm.status === "COMPLETED"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-400/20"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    منفذ (COMPLETED)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickEditForm({ ...quickEditForm, status: "PLANNED" })}
                    className={`py-2 px-3 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all ${
                      quickEditForm.status === "PLANNED"
                        ? "bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-400/20"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    مخطط (PLANNED)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickEditForm({ ...quickEditForm, status: "CANCELLED" })}
                    className={`py-2 px-3 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all ${
                      quickEditForm.status === "CANCELLED"
                        ? "bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-400/20"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    ملغي (CANCELLED)
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  أهداف أو ملاحظات النشاط
                </label>
                <textarea
                  rows={2}
                  value={quickEditForm.notes}
                  onChange={(e) =>
                    setQuickEditForm({ ...quickEditForm, notes: e.target.value })
                  }
                  placeholder="أهداف النشاط أو الجهة المشاركة أو أي توثيق خاص..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none resize-none font-medium"
                />
                {editingActivity.notes && editingActivity.notes.trim().startsWith("{") && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    💡 هذا النشاط مسجل له تقرير وزاري معتمد، سيتم تحديث أهداف النشاط مع الحفاظ على بنود التقرير الرسمي.
                  </p>
                )}
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingActivity(null)}
                  disabled={isSavingQuickEdit}
                  className="font-bold text-xs"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingQuickEdit}
                  className="bg-[#8A1538] hover:bg-[#72112E] text-white font-bold text-xs gap-1.5 shadow-xs"
                >
                  {isSavingQuickEdit ? (
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
      {/* 🌟 MODAL 3: Archive Confirmation Dialog                                  */}
      {/* ========================================================================= */}
      {archivingActivity && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-800">
                  تأكيد أرشفة النشاط
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  هل أنت متأكد من أرشفة النشاط ({archivingActivity.name})؟
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              سيتم إخفاء هذا النشاط من السجل والتقارير العامة مع حفظ سجل العمليات. يمكنك استرجاعه عبر مدير النظام عند الحاجة.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setArchivingActivity(null)}
                className="text-xs font-bold"
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmArchive}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold gap-1.5"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>تأكيد الأرشفة</span>
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Categories Manager Modal */}
      <CategoriesManagerModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        categories={categories}
        canManage={canManageCategories}
      />
    </div>
  );
}
