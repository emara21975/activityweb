"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { purgeDataAction } from "@/app/actions/cleanup-actions";
import { CleanupStats } from "@/lib/services/cleanup-service";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  HardDrive,
  Users,
  CalendarDays,
  UserCheck,
  FileCheck,
  History,
  UploadCloud,
  X,
  FileSpreadsheet,
  ArrowRight,
  Info,
} from "lucide-react";

interface DataCleanupClientProps {
  stats: CleanupStats;
}

export function DataCleanupClient({ stats }: DataCleanupClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [safetyBackupKey, setSafetyBackupKey] = useState<string | null>(null);

  // Modal State
  const [activeModal, setActiveModal] = useState<{
    type: "participations" | "activities" | "students" | "imports" | "audit_logs" | "factory_reset";
    title: string;
    description: string;
    requiredConfirmText?: string;
    academicYearId?: string;
    daysOlderThan?: number;
    dangerLevel: "medium" | "high" | "critical";
  } | null>(null);

  const [confirmInputText, setConfirmInputText] = useState("");
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedAuditPeriod, setSelectedAuditPeriod] = useState<number>(30);

  const handleOpenModal = (
    type: "participations" | "activities" | "students" | "imports" | "audit_logs" | "factory_reset",
    title: string,
    description: string,
    options?: {
      requiredConfirmText?: string;
      academicYearId?: string;
      daysOlderThan?: number;
      dangerLevel?: "medium" | "high" | "critical";
    }
  ) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setSafetyBackupKey(null);
    setConfirmInputText("");
    setActiveModal({
      type,
      title,
      description,
      requiredConfirmText: options?.requiredConfirmText,
      academicYearId: options?.academicYearId,
      daysOlderThan: options?.daysOlderThan,
      dangerLevel: options?.dangerLevel || "medium",
    });
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setConfirmInputText("");
  };

  const handleExecutePurge = () => {
    if (!activeModal) return;

    if (activeModal.requiredConfirmText && confirmInputText.trim() !== activeModal.requiredConfirmText) {
      setErrorMessage(`يرجى كتابة نص التأكيد بدقة: "${activeModal.requiredConfirmText}"`);
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await purgeDataAction({
        type: activeModal.type,
        academicYearId: activeModal.academicYearId || (selectedYearId ? selectedYearId : undefined),
        daysOlderThan: activeModal.type === "audit_logs" ? selectedAuditPeriod : undefined,
        confirmationText: confirmInputText.trim(),
      });

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setSuccessMessage(res.message || "تمت عملية التفريغ بنجاح.");
        if (res.safetyBackupKey) {
          setSafetyBackupKey(res.safetyBackupKey);
        }
        handleCloseModal();
        router.refresh();
      }
    });
  };

  const canConfirm =
    !activeModal?.requiredConfirmText ||
    confirmInputText.trim() === activeModal.requiredConfirmText;

  return (
    <div className="space-y-6">
      {/* Alert Notices */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-900 shadow-2xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h4 className="font-bold text-sm">تم إنجاز العملية بنجاح</h4>
            <p className="text-xs text-emerald-700 mt-0.5">{successMessage}</p>
            {safetyBackupKey && (
              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-[11px] font-medium text-emerald-800">
                  تم حفظ نقطة أمان احتياطية قبل الحذف:
                </span>
                <code className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-emerald-300 font-bold">
                  {safetyBackupKey}
                </code>
                <Link href="/backups" className="text-xs font-bold underline text-emerald-800 hover:text-emerald-950 mr-2">
                  عرض النسخ الاحتياطية
                </Link>
              </div>
            )}
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-500 hover:text-emerald-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-900 shadow-2xs animate-in fade-in">
          <AlertOctagon className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h4 className="font-bold text-sm">حدث خطأ أثناء تنفيذ الإجراء</h4>
            <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Safety Notice Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200/90 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-amber-950 flex items-center gap-2">
              <span>حماية البيانات وضمان الأمان التلقائي</span>
              <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-extrabold">
                أمان 100%
              </span>
            </h3>
            <p className="text-xs text-amber-800/90 mt-0.5 leading-relaxed">
              يقوم النظام تلقائياً بتوليد <strong>نقطة أمان احتياطية كاملة (Safety Backup)</strong> قبل تنفيذ أي عملية تفريغ أو حذف، لتتمكن من استعادة البيانات بضغطة زر في أي وقت من قسم النسخ الاحتياطي.
            </p>
          </div>
        </div>
        <Link href="/backups" className="shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1.5 border-amber-300 text-amber-900 hover:bg-amber-100 font-bold bg-white"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>سجل النسخ الاحتياطية</span>
          </Button>
        </Link>
      </div>

      {/* Live Data Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-500">المشاركات الطلابية</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {stats.participationsCount.toLocaleString("ar-QA")}
          </p>
          <span className="text-[10px] text-slate-400 font-medium">سجلات حضور المشاركات</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-500">الأنشطة والفعاليات</span>
            <CalendarDays className="w-4 h-4 text-[#8A1538]" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {stats.activitiesCount.toLocaleString("ar-QA")}
          </p>
          <span className="text-[10px] text-slate-400 font-medium">
            مع {stats.attachmentsCount} ملف ومرفق
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-500">الطلاب المسجلون</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {stats.studentsCount.toLocaleString("ar-QA")}
          </p>
          <span className="text-[10px] text-slate-400 font-medium">
            {stats.enrollmentsCount} قيد دراسي بالشعب
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-500">سجل العمليات والتدقيق</span>
            <History className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {stats.auditLogsCount.toLocaleString("ar-QA")}
          </p>
          <span className="text-[10px] text-slate-400 font-medium">سجل أحداث النظام</span>
        </div>
      </div>

      {/* Main Purge Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Clear Participations */}
        <Card className="p-5 border-slate-200 bg-white flex flex-col justify-between hover:border-slate-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
              <Badge variant="success">عملية آمنة</Badge>
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">تفريغ تسجيل المشاركات فقط</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              حذف سجلات تسجيل مشاركات وحضور الطلاب، مع الإبقاء الكامل على قائمة الأنشطة والفعاليات وقوائم الطلاب دون أي تغيير.
            </p>

            <div className="mb-4">
              <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                تحديد نطاق العام الدراسي:
              </label>
              <select
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="w-full text-xs font-semibold p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 outline-none focus:border-[#8A1538]"
              >
                <option value="">كافة المشاركات في جميع الأعوام ({stats.participationsCount})</option>
                {stats.academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.is_current ? "(الحالي)" : ""} — {y.participationsCount} مشاركة
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">لا يحذف الأنشطة ولا الطلاب</span>
            <Button
              onClick={() =>
                handleOpenModal(
                  "participations",
                  "تأكيد تفريغ تسجيل المشاركات",
                  `هل أنت متأكد من تفريغ سجلات المشاركة ${
                    selectedYearId ? "للعام الدراسي المحدد" : "لكافة الأعوام"
                  }؟ سيتم الاحتفاظ بالأنشطة والطلاب كما هي.`,
                  {
                    academicYearId: selectedYearId,
                    dangerLevel: "medium",
                  }
                )
              }
              variant="outline"
              size="sm"
              className="text-xs font-bold text-emerald-800 border-emerald-200 hover:bg-emerald-50"
            >
              <Trash2 className="w-3.5 h-3.5 ml-1.5" />
              <span>تفريغ المشاركات</span>
            </Button>
          </div>
        </Card>

        {/* 2. Clear Activities & Attachments */}
        <Card className="p-5 border-slate-200 bg-white flex flex-col justify-between hover:border-slate-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
                <CalendarDays className="w-4 h-4" />
              </div>
              <Badge variant="warning">متوسط الخطورة</Badge>
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">تفريغ الأنشطة والفعاليات ومرفقاتها</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              حذف سجلات الفعاليات والأنشطة المدرسية مع ملفاتها ومرفقاتها ومشاركاتها المرتبطة بها، مع الإبقاء الكامل على الطلاب والمستخدمين.
            </p>

            <div className="mb-4">
              <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                تحديد نطاق العام الدراسي:
              </label>
              <select
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="w-full text-xs font-semibold p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 outline-none focus:border-[#8A1538]"
              >
                <option value="">كافة الأنشطة في جميع الأعوام ({stats.activitiesCount} نشاط)</option>
                {stats.academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.is_current ? "(الحالي)" : ""} — {y.activitiesCount} نشاط
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">يحذف ملفات وصور الأنشطة</span>
            <Button
              onClick={() =>
                handleOpenModal(
                  "activities",
                  "تأكيد تفريغ الأنشطة والفعاليات",
                  `هل أنت متأكد من حذف الفعاليات والأنشطة ومرفقاتها ${
                    selectedYearId ? "للعام الدراسي المحدد" : "لكافة الأعوام"
                  }؟`,
                  {
                    academicYearId: selectedYearId,
                    dangerLevel: "high",
                  }
                )
              }
              variant="outline"
              size="sm"
              className="text-xs font-bold text-amber-800 border-amber-200 hover:bg-amber-50"
            >
              <Trash2 className="w-3.5 h-3.5 ml-1.5" />
              <span>تفريغ الأنشطة والمرفقات</span>
            </Button>
          </div>
        </Card>

        {/* 3. Clear Students & Enrollments */}
        <Card className="p-5 border-rose-200 bg-white flex flex-col justify-between hover:border-rose-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <Badge variant="danger">عالي الخطورة</Badge>
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">تفريغ سجلات الطلاب والشعب</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              حذف كافة سجلات الطلاب وقيودهم الدراسية في الشعب ومشاركاتهم. يُستخدم هذا الإجراء عند الاستعداد لبدء عام دراسي جديد واستيراد قائمة طلاب حديثة من نظام الوزارة.
            </p>

            <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 mb-4 text-[11px] text-rose-900 leading-relaxed">
              <strong>تنبيه:</strong> سيتم حذف {stats.studentsCount} طالباً و {stats.enrollmentsCount} قيداً دراسياً. يتطلب كتابة عبارة تأكيد نصية.
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">تفريغ شامل لسجل الطلاب</span>
            <Button
              onClick={() =>
                handleOpenModal(
                  "students",
                  "تأكيد تفريغ كافة سجلات الطلاب",
                  `سيؤدي هذا الإجراء إلى حذف جميع الطلاب (${stats.studentsCount}) وقيودهم المدرسية ومشاركاتهم نهائياً. تأكد من رغبتك قبل المتابعة.`,
                  {
                    requiredConfirmText: "تفريغ الطلاب",
                    dangerLevel: "critical",
                  }
                )
              }
              variant="outline"
              size="sm"
              className="text-xs font-bold text-rose-700 border-rose-200 hover:bg-rose-50"
            >
              <Trash2 className="w-3.5 h-3.5 ml-1.5" />
              <span>تفريغ سجلات الطلاب</span>
            </Button>
          </div>
        </Card>

        {/* 4. Clear Import Batches & Errors */}
        <Card className="p-5 border-slate-200 bg-white flex flex-col justify-between hover:border-slate-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center">
                <UploadCloud className="w-4 h-4" />
              </div>
              <Badge variant="neutral">صيانة دورية</Badge>
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">تنظيف دفعات الاستيراد القديمة</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              حذف سجلات دفعات الاستيراد السابقة وتقارير الأخطاء التفصيلية المؤقتة لتنظيف قاعدة البيانات، دون التأثير على الطلاب المستوردين بالفعل.
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-4 text-xs font-medium text-slate-600 flex items-center justify-between">
              <span>دفعات الاستيراد المسجلة:</span>
              <span className="font-mono font-bold text-slate-800">
                {stats.importBatchesCount} دفعة
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">لا يؤثر على بيانات الطلاب الحالية</span>
            <Button
              onClick={() =>
                handleOpenModal(
                  "imports",
                  "تنظيف سجلات ودفعات الاستيراد",
                  "هل ترغب في حذف سجلات الاستيراد السابقة؟ لن تتأثر بيانات الطلاب أو الأنشطة التي تم استيرادها سابقاً.",
                  { dangerLevel: "medium" }
                )
              }
              variant="outline"
              size="sm"
              className="text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50"
            >
              <Trash2 className="w-3.5 h-3.5 ml-1.5" />
              <span>تفريغ سجل الاستيراد</span>
            </Button>
          </div>
        </Card>

        {/* 5. Clear Audit Logs */}
        <Card className="p-5 border-slate-200 bg-white flex flex-col justify-between hover:border-slate-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center">
                <History className="w-4 h-4" />
              </div>
              <Badge variant="neutral">سجلات أمنية</Badge>
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">أرشفة وتفريغ سجل التدقيق والعمليات</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              حذف سجل العمليات والتدقيق الأمني القديم لتخفيف حجم قاعدة البيانات وتحسين كفاءة الاستعلامات.
            </p>

            <div className="mb-4">
              <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                تفريغ السجلات:
              </label>
              <select
                value={selectedAuditPeriod}
                onChange={(e) => setSelectedAuditPeriod(Number(e.target.value))}
                className="w-full text-xs font-semibold p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 outline-none focus:border-[#8A1538]"
              >
                <option value={30}>الأقدم من 30 يوماً</option>
                <option value={90}>الأقدم من 90 يوماً</option>
                <option value={180}>الأقدم من 6 أشهر (180 يوماً)</option>
                <option value={0}>كافة سجلات التدقيق ({stats.auditLogsCount} سجل)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">سجل الأحداث والعمليات</span>
            <Button
              onClick={() =>
                handleOpenModal(
                  "audit_logs",
                  "تفريغ سجل التدقيق والعمليات",
                  `هل ترغب في تفريغ سجل العمليات ${
                    selectedAuditPeriod > 0
                      ? `الأقدم من ${selectedAuditPeriod} يوماً`
                      : "بالكامل لكافة السجلات"
                  }؟`,
                  {
                    daysOlderThan: selectedAuditPeriod,
                    dangerLevel: "medium",
                  }
                )
              }
              variant="outline"
              size="sm"
              className="text-xs font-bold text-indigo-700 border-indigo-200 hover:bg-indigo-50"
            >
              <Trash2 className="w-3.5 h-3.5 ml-1.5" />
              <span>تفريغ سجل العمليات</span>
            </Button>
          </div>
        </Card>

        {/* 6. Factory Reset / Full Purge */}
        <Card className="p-5 border-2 border-red-300 bg-gradient-to-br from-white to-red-50/40 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full">
                إعادة ضبط المصنع
              </span>
            </div>

            <h3 className="font-extrabold text-red-950 text-sm mb-1">
              التفريغ الشامل للبيانات (إعادة ضبط النظام)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              يقوم بتصفير كافة البيانات التشغيلية (المشاركات، الأنشطة والمرفقات، والطلاب وسجلات القيد) بالكامل مع <strong>الحفاظ التام على المستخدمين وإعدادات المدرسة والأعوام وتصنيفات الأنشطة</strong>.
            </p>

            <div className="space-y-1.5 p-3 rounded-xl bg-white border border-red-200 text-[11px] mb-4">
              <div className="flex items-center gap-2 text-rose-700 font-semibold">
                <X className="w-3.5 h-3.5 shrink-0" />
                <span>سيتم تفريغ: كافة المشاركات، الفعاليات، الطلاب، القيود، ودفعات الاستيراد.</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>سيتم الحفاظ على: حسابات المشرفين، الأدوار، إعدادات المدرسة، والنسخ الاحتياطية.</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-red-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-red-600">يتطلب تأكيداً كتابياً إجبارياً</span>
            <Button
              onClick={() =>
                handleOpenModal(
                  "factory_reset",
                  "إعادة ضبط المصنع وتفريغ النظام الشامل",
                  "أنت على وشك تصفير وتفريغ جميع المشاركات والأنشطة وسجلات الطلاب بالكامل. هذا الإجراء حرج ويتم توليد نسخة أمان احتياطية كاملة قبله تلقائياً.",
                  {
                    requiredConfirmText: "تفريغ شامل للمصنع",
                    dangerLevel: "critical",
                  }
                )
              }
              variant="primary"
              size="sm"
              className="text-xs font-black bg-red-600 hover:bg-red-700 text-white shadow-xs"
            >
              <AlertOctagon className="w-3.5 h-3.5 ml-1.5" />
              <span>إعادة ضبط المصنع</span>
            </Button>
          </div>
        </Card>
      </div>

      {/* Confirmation Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    activeModal.dangerLevel === "critical"
                      ? "bg-red-100 text-red-700 border border-red-200"
                      : activeModal.dangerLevel === "high"
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-slate-100 text-slate-800 border border-slate-200"
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{activeModal.title}</h3>
                  <span className="text-[11px] text-slate-400">إجراء إداري مؤكد بنقطة أمان</span>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={isPending}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              {activeModal.description}
            </p>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center gap-2.5 text-emerald-900 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                سيتم تلقائياً حفظ <strong>نقطة أمان احتياطية كاملة</strong> للنظام قبل البدء بالحذف.
              </span>
            </div>

            {/* Mandatory confirmation text input for critical actions */}
            {activeModal.requiredConfirmText && (
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-800 block">
                  لتأكيد العملية، يرجى كتابة العبارة التالية بدقة:
                  <span className="inline-block mx-1.5 font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200 font-extrabold select-all">
                    {activeModal.requiredConfirmText}
                  </span>
                </label>
                <input
                  type="text"
                  value={confirmInputText}
                  onChange={(e) => setConfirmInputText(e.target.value)}
                  placeholder={`اكتب هنا: ${activeModal.requiredConfirmText}`}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-mono text-center font-bold focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
                  autoFocus
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseModal}
                disabled={isPending}
                className="text-xs font-bold text-slate-600"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleExecutePurge}
                disabled={!canConfirm || isPending}
                variant="primary"
                size="sm"
                className={`text-xs font-bold gap-1.5 ${
                  activeModal.dangerLevel === "critical"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : activeModal.dangerLevel === "high"
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-[#8A1538] hover:bg-[#72112E] text-white"
                }`}
              >
                {isPending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري حفظ نقطة الأمان والتفريغ...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>تأكيد وتنفيذ التفريغ</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
