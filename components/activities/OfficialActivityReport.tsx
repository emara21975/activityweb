"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Printer,
  FileText,
  Edit3,
  Info,
  Check,
  CheckSquare,
  Square,
  Star,
  Eye,
  Trash2,
  UploadCloud,
  Download,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateActivityReportAction } from "@/app/actions/activity-report-actions";
import { uploadAttachmentAction, archiveAttachmentAction } from "@/app/actions/attachment-actions";
import { ACTIVITY_REPORT_TEMPLATE_LABELS, type ActivityReportTemplate } from "@/lib/auth/report-template";

interface OfficialActivityReportProps {
  activity: any;
  schoolName: string;
  canEdit?: boolean;
  /** Word forms this user may export; the first one is their own report */
  reportTemplates?: ActivityReportTemplate[];
}

export function OfficialActivityReport({
  activity,
  schoolName,
  canEdit = true,
  reportTemplates = ["SPECIALIST"],
}: OfficialActivityReportProps) {
  // Maroon school form (teacher) vs petrol form (specialist) have slightly different fields
  const hasSchoolForm = reportTemplates.includes("ANNUAL");
  const hasSpecialistForm = reportTemplates.includes("SPECIALIST");
  const academicYear = activity.academic_year?.name || "2026-2027";
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Initialize and sync photos state from activity.attachments
  const getFilteredPhotos = (atts: any[]) => {
    return (atts || []).filter((att: any) =>
      att.mime_type?.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(att.original_name || "")
    );
  };

  const [photoList, setPhotoList] = useState<any[]>(() => getFilteredPhotos(activity.attachments));

  React.useEffect(() => {
    setPhotoList(getFilteredPhotos(activity.attachments));
  }, [activity.attachments]);

  // Parse notes JSON or defaults
  let reportData: any = {};
  if (activity.notes) {
    try {
      reportData = JSON.parse(activity.notes);
    } catch {
      reportData = { objectives: activity.notes };
    }
  }

  // Calculate day name
  const getArabicDayName = (dateStr: string) => {
    try {
      const dt = new Date(dateStr);
      const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      return days[dt.getDay()];
    } catch {
      return "—";
    }
  };

  const activityDateStr = new Date(activity.activity_date).toISOString().split("T")[0];
  const dayName = reportData.day_name || getArabicDayName(activity.activity_date);

  const activityType = reportData.activity_type || "خطة معتمدة";
  const activityTypeOther = reportData.activity_type_other || "";
  const targetGroup = reportData.target_group || "جميع طلاب المدرسة";
  const responsibleDepartment = reportData.responsible_department || `قسم ${activity.category?.name_ar || "الأنشطة"}`;
  const externalEntity = reportData.external_entity || "—";
  const externalHonored = Boolean(reportData.external_honored);
  const parentParticipation = Boolean(reportData.parent_participation);
  const activationMethod = reportData.activation_method || "فعالية";
  const activationMethodOther = reportData.activation_method_other || "";
  const objectives = reportData.objectives || activity.notes || "تنمية معارف ومهارات الطلاب القيادية والإبداعية وتفعيل الشراكة المجتمعية.";
  const executionSteps = reportData.execution_steps || "1. الإعداد والتنسيق المسبق للفعالية وحصر الاحتياجات.\n2. تنفيذ البرنامج وتوزيع الأدوار على الطلاب المشاركين.\n3. التقييم الميداني وتكريم المشاركين المتميزين.";
  const safetyMeasures = reportData.safety_measures || "الالتزام التام بكافة معايير الأمن والسلامة المدرسية وتوفير الإشراف الميداني المستمر.";
  const studentSatisfaction = reportData.student_satisfaction ?? 5;
  const activityQuality = reportData.activity_quality ?? 5;
  const recommendations = reportData.recommendations || "مواصلة تنظيم مثل هذه البرامج الهادفة وتطوير آليات التقييم والتكريم.";
  const timePeriod = reportData.time_period || "";
  const supervisorName = reportData.supervisor_name || "";
  const principalName = reportData.principal_name || "";

  const handlePrint = () => {
    window.print();
  };

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    slotIdx: number,
    replacePhotoId?: string
  ) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const inputElement = e.target;
    setUploadingSlot(slotIdx);
    try {
      if (replacePhotoId) {
        await archiveAttachmentAction(replacePhotoId, activity.id);
      }
      const formData = new FormData();
      formData.append("activity_id", activity.id);
      formData.append("file", file);
      const res = await uploadAttachmentAction(null, formData);
      if (res?.error) {
        alert(res.error);
      } else if (res?.attachment) {
        setPhotoList((prev) => {
          const next = [...prev];
          if (slotIdx < next.length) {
            next[slotIdx] = res.attachment;
          } else {
            next.push(res.attachment);
          }
          return next;
        });
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (err: any) {
      alert(err?.message || "حدث خطأ أثناء رفع الصورة");
    } finally {
      inputElement.value = "";
      setUploadingSlot(null);
    }
  };

  const handlePhotoDelete = async (photoId: string, photoName: string) => {
    // If this is the first click, enter confirmation state
    if (confirmDeleteId !== photoId) {
      setConfirmDeleteId(photoId);
      // Auto-reset confirmation after 5 seconds if user changes mind
      setTimeout(() => {
        setConfirmDeleteId((cur) => (cur === photoId ? null : cur));
      }, 5000);
      return;
    }

    setConfirmDeleteId(null);
    setDeletingPhotoId(photoId);

    // Optimistically remove photo from client state immediately
    const removedPhoto = photoList.find((p) => p.id === photoId);
    setPhotoList((prev) => prev.filter((p) => p.id !== photoId));

    try {
      const res = await archiveAttachmentAction(photoId, activity.id);
      if (res?.error) {
        // Rollback state if server action returns an error
        if (removedPhoto) {
          setPhotoList((prev) => [...prev, removedPhoto]);
        }
        alert(res.error);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      if (removedPhoto) {
        setPhotoList((prev) => [...prev, removedPhoto]);
      }
      alert(err?.message || "حدث خطأ أثناء حذف الصورة");
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const wordExportUrl = (template: ActivityReportTemplate) =>
    `/api/activities/${activity.id}/export/word?template=${template.toLowerCase()}`;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      await updateActivityReportAction(activity.id, formData);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء حفظ التقرير");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Bar (Screen Only) */}
      <div className="print:hidden space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <span className="text-xs text-slate-400 font-bold block">التقرير الرسمي للنشاط المعتمد (وزارة التربية والتعليم)</span>
            <span className="text-sm font-black text-slate-800">{activity.name}</span>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {canEdit && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
                className="gap-1.5 font-bold text-slate-700 hover:bg-slate-50 border-slate-200"
              >
                <Edit3 className="w-4 h-4 text-amber-600" />
                <span>تعديل بيانات التقرير</span>
              </Button>
            )}

            {reportTemplates.map((template) => (
              <a key={template} href={wordExportUrl(template)} download>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 font-bold text-slate-700 hover:bg-slate-50 border-slate-200 shadow-xs"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>
                    {reportTemplates.length > 1
                      ? `وورد: ${ACTIVITY_REPORT_TEMPLATE_LABELS[template]}`
                      : "تصدير وورد (تحميل Word .docx)"}
                  </span>
                </Button>
              </a>
            ))}

            <Button
              onClick={handlePrint}
              variant="primary"
              size="sm"
              className="gap-1.5 font-bold shadow-xs bg-[#8A1538] hover:bg-[#72112E] text-white"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة التقرير الرسمي (HTML / PDF)</span>
            </Button>
          </div>
        </div>

        {/* Guidance Alert */}
        <div className="bg-amber-50/80 border border-amber-200/70 rounded-xl px-3.5 py-2 text-xs text-amber-900 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong className="font-bold">خيارات التقرير الرسمي:</strong> يمكنك تحميل نموذج الوورد الأصلي المعتمد بالضغط على <strong>«تصدير وورد (.docx)»</strong> أو حفظه كـ PDF عالي الدقة بالضغط على <strong>«طباعة التقرير الرسمي»</strong> واختيار «حفظ بتنسيق PDF».
            </span>
          </div>
          <span className="text-[10px] text-amber-700 font-mono hidden md:inline">
            مطابق 100% لنموذج الوزارة
          </span>
        </div>
      </div>

      {/* Official Document Container (Identical to Word Doc) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs print:p-0 print:border-none print:shadow-none space-y-6 text-slate-900">
        {/* Official Header */}
        <div className="border-b-2 border-[#8A1538] pb-4 mb-4">
          <div className="flex items-center justify-between">
            {/* Right: State of Qatar & Ministry Info */}
            <div className="space-y-1 text-right">
              <p className="font-bold text-sm text-slate-800">دولة قطر</p>
              <p className="font-bold text-xs text-slate-700">وزارة التربية والتعليم والتعليم العالي</p>
              <p className="font-medium text-[11px] text-slate-600">إدارة شؤون المدارس والطلبة</p>
              <p className="font-medium text-[11px] text-[#8A1538] font-bold">قسم البرامج والأنشطة</p>
            </div>

            {/* Center: Official Title */}
            <div className="text-center space-y-1">
              <h2 className="text-lg md:text-xl font-black text-[#8A1538] tracking-tight">
                {reportTemplates[0] === "ANNUAL"
                  ? `تقرير الأنشطة اللاصفية للعام الأكاديمي ${academicYear}`
                  : `تقرير البرامج والأنشطة اللامنهجية ${academicYear}`}
              </h2>
              <p className="text-xs text-slate-500 font-bold">
                {schoolName}
              </p>
            </div>

            {/* Left: Emblem */}
            <div className="w-20 h-20 relative flex items-center justify-center">
              <Image
                src="/image2.png"
                alt="شعار وزارة التربية والتعليم"
                width={80}
                height={80}
                className="object-contain"
                onError={(e) => {
                  // Fallback to text if missing
                  (e.target as any).style.display = "none";
                }}
              />
            </div>
          </div>
        </div>

        {/* Official Ministry Table (Table 0) */}
        <div className="border border-slate-400 print:border-black rounded-lg overflow-hidden">
          <table className="w-full text-right border-collapse text-xs print:text-[11px]">
            <tbody>
              {/* Row 0: اسم المدرسة */}
              <tr className="border-b border-slate-300 print:border-black">
                <td className="bg-slate-50 print:bg-slate-100 font-bold p-2.5 w-36 text-center border-l border-slate-300 print:border-black text-[#8A1538]">
                  اسم المدرسة
                </td>
                <td className="p-2.5 font-bold text-slate-900" colSpan={3}>
                  {schoolName}
                </td>
              </tr>

              {/* Row 1: التاريخ واليوم */}
              <tr className="border-b border-slate-300 print:border-black">
                <td className="bg-slate-50 print:bg-slate-100 font-bold p-2.5 w-36 text-center border-l border-slate-300 print:border-black text-[#8A1538]">
                  اليوم
                </td>
                <td className="p-2.5 font-bold border-l border-slate-300 print:border-black w-1/3">
                  {dayName}
                </td>
                <td className="bg-slate-50 print:bg-slate-100 font-bold p-2.5 w-36 text-center border-l border-slate-300 print:border-black text-[#8A1538]">
                  التاريخ
                </td>
                <td className="p-2.5 font-bold font-mono">
                  {activityDateStr}
                </td>
              </tr>

              {/* Row 2: عنوان النشاط */}
              <tr className="border-b border-slate-300 print:border-black">
                <td className="bg-slate-50 print:bg-slate-100 font-bold p-2.5 w-36 text-center border-l border-slate-300 print:border-black text-[#8A1538]">
                  عنوان النشاط
                </td>
                <td className="p-2.5 font-black text-sm text-slate-900" colSpan={3}>
                  {activity.name}
                </td>
              </tr>

              {/* Row 3: نوع النشاط */}
              <tr className="border-b border-slate-300 print:border-black">
                <td className="bg-slate-50 print:bg-slate-100 font-bold p-2.5 w-36 text-center border-l border-slate-300 print:border-black text-[#8A1538]">
                  نوع النشاط
                </td>
                <td className="p-2.5" colSpan={3}>
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    {["خطة معتمدة", "مناسبة", "هوية وطنية", "قيم تربوية", "تعميم"].map((t) => (
                      <span key={t} className="flex items-center gap-1.5 font-medium">
                        {activityType === t ? (
                          <CheckSquare className="w-4 h-4 text-[#8A1538]" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                        <span>{t}</span>
                      </span>
                    ))}
                    <span className="flex items-center gap-1.5 font-medium">
                      {activityType === "أخرى" ? (
                        <CheckSquare className="w-4 h-4 text-[#8A1538]" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300" />
                      )}
                      <span>أخرى، تذكر ({activityTypeOther || "........................"})</span>
                    </span>
                  </div>
                </td>
              </tr>

              {/* Row 4: الفئة المستهدفة وإحصاءات الطلبة */}
              <tr className="border-b border-slate-300 print:border-black">
                <td className="bg-slate-50 print:bg-slate-100 font-bold p-2.5 text-center border-l border-slate-300 print:border-black text-[#8A1538]">
                  الفئة المستهدفة / المرحلة
                </td>
                <td className="p-2.5 font-bold border-l border-slate-300 print:border-black">
                  {targetGroup}
                </td>
                <td className="p-0" colSpan={2}>
                  <table className="w-full h-full text-center border-collapse">
                    <tbody>
                      <tr>
                        <td className="bg-slate-50 print:bg-slate-100 font-bold p-2 border-l border-slate-300 print:border-black text-slate-700">
                          إجمالي الطلبة
                        </td>
                        <td className="p-2 font-black border-l border-slate-300 print:border-black">
                          {activity.totalParticipants}
                        </td>
                        <td className="bg-slate-50 print:bg-slate-100 font-bold p-2 border-l border-slate-300 print:border-black text-[#8A1538]">
                          قطري
                        </td>
                        <td className="p-2 font-black text-[#8A1538] border-l border-slate-300 print:border-black">
                          {activity.qatariCount}
                        </td>
                        <td className="bg-slate-50 print:bg-slate-100 font-bold p-2 border-l border-slate-300 print:border-black text-slate-600">
                          غير قطري
                        </td>
                        <td className="p-2 font-black text-slate-700">
                          {activity.nonQatariCount}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

              {/* Row 5: القسم المسؤول والجهة الخارجية */}
              <tr className="border-b border-slate-300 print:border-black">
                <td className="bg-slate-50 print:bg-slate-100 font-bold p-2.5 text-center border-l border-slate-300 print:border-black text-[#8A1538]">
                  الجهة الخارجية المنفذة
                </td>
                <td className="p-2.5 font-bold border-l border-slate-300 print:border-black">
                  {externalEntity}
                </td>
                <td className="bg-slate-50 print:bg-slate-100 font-bold p-2.5 text-center border-l border-slate-300 print:border-black text-[#8A1538]">
                  القسم المسؤول
                </td>
                <td className="p-2.5 font-bold">
                  {responsibleDepartment}
                </td>
              </tr>

              {/* Row 6: تكريم الجهة الخارجية ومشاركة أولياء الأمور */}
              <tr className="border-b border-slate-300 print:border-black">
                <td className="bg-slate-50 print:bg-slate-100 font-bold p-2.5 text-center border-l border-slate-300 print:border-black text-[#8A1538]">
                  تكريم الجهة الخارجية
                </td>
                <td className="p-2.5 border-l border-slate-300 print:border-black">
                  <div className="flex items-center gap-6">
                    <span className="flex items-center gap-1.5 font-bold">
                      {externalHonored ? <CheckSquare className="w-4 h-4 text-emerald-700" /> : <Square className="w-4 h-4 text-slate-300" />}
                      <span>نعم</span>
                    </span>
                    <span className="flex items-center gap-1.5 font-bold">
                      {!externalHonored ? <CheckSquare className="w-4 h-4 text-rose-700" /> : <Square className="w-4 h-4 text-slate-300" />}
                      <span>لا</span>
                    </span>
                  </div>
                </td>
                <td className="bg-slate-50 print:bg-slate-100 font-bold p-2.5 text-center border-l border-slate-300 print:border-black text-[#8A1538]">
                  مشاركة أولياء الأمور
                </td>
                <td className="p-2.5">
                  <div className="flex items-center gap-6">
                    <span className="flex items-center gap-1.5 font-bold">
                      {parentParticipation ? <CheckSquare className="w-4 h-4 text-emerald-700" /> : <Square className="w-4 h-4 text-slate-300" />}
                      <span>نعم</span>
                    </span>
                    <span className="flex items-center gap-1.5 font-bold">
                      {!parentParticipation ? <CheckSquare className="w-4 h-4 text-rose-700" /> : <Square className="w-4 h-4 text-slate-300" />}
                      <span>لا</span>
                    </span>
                  </div>
                </td>
              </tr>

              {/* Row 7: طريقة تفعيل النشاط */}
              <tr className="border-b border-slate-300 print:border-black">
                <td className="bg-slate-50 print:bg-slate-100 font-bold p-2.5 text-center border-l border-slate-300 print:border-black text-[#8A1538]">
                  طريقة تفعيل النشاط
                </td>
                <td className="p-2.5" colSpan={3}>
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    {["ورشة", "مسابقة", "فعالية", "محاضرة", "رحلة", "عن بُعد (افتراضي)"].map((m) => (
                      <span key={m} className="flex items-center gap-1.5 font-medium">
                        {activationMethod === m ? (
                          <CheckSquare className="w-4 h-4 text-[#8A1538]" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                        <span>{m}</span>
                      </span>
                    ))}
                    <span className="flex items-center gap-1.5 font-medium">
                      {activationMethod === "أخرى" ? (
                        <CheckSquare className="w-4 h-4 text-[#8A1538]" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300" />
                      )}
                      <span>أخرى، تذكر ({activationMethodOther || "........................"})</span>
                    </span>
                  </div>
                </td>
              </tr>

              {/* Row 8: الهدف من النشاط */}
              <tr className="border-b border-slate-300 print:border-black">
                <td className="bg-slate-50 print:bg-slate-100 font-bold p-2.5 text-center border-l border-slate-300 print:border-black text-[#8A1538]">
                  الهدف من النشاط
                </td>
                <td className="p-2.5 text-slate-800 leading-relaxed font-medium" colSpan={3}>
                  {objectives}
                </td>
              </tr>

              {/* Row 9: خطوات تنفيذ النشاط */}
              <tr className="border-b border-slate-300 print:border-black">
                <td className="bg-slate-50 print:bg-slate-100 font-bold p-2.5 text-center border-l border-slate-300 print:border-black text-[#8A1538]">
                  خطوات تنفيذ النشاط
                </td>
                <td className="p-2.5 text-slate-800 leading-relaxed font-medium whitespace-pre-line" colSpan={3}>
                  {executionSteps}
                </td>
              </tr>

              {/* Row 10: إجراءات الأمن والسلامة */}
              <tr className="border-b border-slate-300 print:border-black">
                <td className="bg-slate-50 print:bg-slate-100 font-bold p-2.5 text-center border-l border-slate-300 print:border-black text-[#8A1538]">
                  إجراءات الأمن والسلامة
                </td>
                <td className="p-2.5 text-slate-800 leading-relaxed font-medium" colSpan={3}>
                  {safetyMeasures}
                </td>
              </tr>

              {/* Row 11 & 12: مدى رضا الطلبة */}
              <tr className="border-b border-slate-300 print:border-black">
                <td className="bg-slate-50 print:bg-slate-100 font-bold p-2.5 text-center border-l border-slate-300 print:border-black text-[#8A1538]">
                  مدى رضا الطلبة
                </td>
                <td className="p-0" colSpan={3}>
                  <div className="grid grid-cols-5 text-center text-xs divide-x divide-x-reverse divide-slate-300 print:divide-black">
                    {[
                      { val: 5, label: "5 (راضٍ جداً)" },
                      { val: 4, label: "4 (راضٍ)" },
                      { val: 3, label: "3 (محايد)" },
                      { val: 2, label: "2 (غير راضٍ)" },
                      { val: 1, label: "1 (غير راض أبداً)" },
                    ].map((item) => (
                      <div key={item.val} className={`p-2 ${studentSatisfaction === item.val ? "bg-emerald-50/80 font-black text-emerald-800" : "text-slate-600"}`}>
                        <span className="block text-[11px]">{item.label}</span>
                        <div className="mt-1 flex items-center justify-center">
                          {studentSatisfaction === item.val ? (
                            <Check className="w-4 h-4 text-emerald-700 stroke-[3]" />
                          ) : (
                            <span className="w-3 h-3 border border-slate-300 rounded-xs block" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </td>
              </tr>

              {/* Row 13 & 14: جودة النشاط */}
              <tr className="border-b border-slate-300 print:border-black">
                <td className="bg-slate-50 print:bg-slate-100 font-bold p-2.5 text-center border-l border-slate-300 print:border-black text-[#8A1538]">
                  جودة النشاط
                </td>
                <td className="p-0" colSpan={3}>
                  <div className="grid grid-cols-5 text-center text-xs divide-x divide-x-reverse divide-slate-300 print:divide-black">
                    {[
                      { val: 5, label: "5 (ممتاز / راضٍ جداً)" },
                      { val: 4, label: "4 (جيد جداً / راضٍ)" },
                      { val: 3, label: "3 (متوسط / محايد)" },
                      { val: 2, label: "2 (ضعيف / غير راضٍ)" },
                      { val: 1, label: "1 (غير مرضي)" },
                    ].map((item) => (
                      <div key={item.val} className={`p-2 ${activityQuality === item.val ? "bg-[#8A1538]/10 font-black text-[#8A1538]" : "text-slate-600"}`}>
                        <span className="block text-[11px]">{item.label}</span>
                        <div className="mt-1 flex items-center justify-center">
                          {activityQuality === item.val ? (
                            <Check className="w-4 h-4 text-[#8A1538] stroke-[3]" />
                          ) : (
                            <span className="w-3 h-3 border border-slate-300 rounded-xs block" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </td>
              </tr>

              {/* Row 15: التوصيات / المقترحات */}
              <tr>
                <td className="bg-slate-50 print:bg-slate-100 font-bold p-2.5 text-center border-l border-slate-300 print:border-black text-[#8A1538]">
                  التوصيات / المقترحات
                </td>
                <td className="p-2.5 text-slate-800 leading-relaxed font-medium" colSpan={3}>
                  {recommendations}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 2: صـــور النشاط التوثيقية (Photo Grid) */}
        <div className="space-y-3 break-before-page">
          <div className="bg-[#8A1538] text-white py-2 px-4 rounded-lg font-black text-center text-sm tracking-wide">
            صـــــور النشــــاط التوثيقيــــة
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((idx) => {
              const photo = photoList[idx];
              const isDeleting = deletingPhotoId === photo?.id;
              const isConfirming = confirmDeleteId === photo?.id;
              const isUploading = uploadingSlot === idx;
              const imageUrl = photo ? `/api/attachments/${photo.id}?v=${photo.checksum || photo.created_at || '1'}` : null;

              return (
                <div
                  key={idx}
                  className="relative w-full h-64 sm:h-72 rounded-xl border-2 border-dashed border-slate-300 print:border-slate-400 bg-slate-50 flex flex-col items-center justify-center p-1.5 overflow-hidden group shadow-2xs"
                  style={{ minHeight: "240px", aspectRatio: "4/3" }}
                >
                  {imageUrl ? (
                    <>
                      <img
                        src={imageUrl}
                        alt={photo.original_name || `صورة التوثيق ${idx + 1}`}
                        className="w-full h-full object-cover rounded-lg transition-transform duration-300 group-hover:scale-105"
                        loading="eager"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.dataset.retried) {
                            target.dataset.retried = "1";
                            target.src = `/api/attachments/${photo.id}?t=${Date.now()}`;
                          }
                        }}
                      />

                      {/* Screen-only Action Overlay (Always visible bar on bottom, print hidden) */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-2.5 flex items-center justify-between gap-2 z-10 print:hidden transition-all duration-200">
                        <span className="text-[11px] font-bold text-white truncate max-w-[140px]" title={photo.original_name}>
                          {photo.original_name}
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewPhoto({ url: imageUrl, title: photo.original_name });
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold backdrop-blur-xs transition-colors shadow-xs"
                            title="تكبير ومعاينة الصورة"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>معاينة</span>
                          </button>

                          {canEdit && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePhotoDelete(photo.id, photo.original_name);
                              }}
                              disabled={isDeleting}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all shadow-xs ${
                                isConfirming
                                  ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
                                  : "bg-black/60 hover:bg-rose-600 text-white"
                              }`}
                              title={isConfirming ? "انقر مرة أخرى لتأكيد الحذف الفوري" : "حذف الصورة"}
                            >
                              {isDeleting ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>جاري الحذف...</span>
                                </>
                              ) : isConfirming ? (
                                <>
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>تأكيد الحذف؟</span>
                                </>
                              ) : (
                                <>
                                  <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                                  <span>حذف</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4 space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                        {isUploading ? (
                          <Loader2 className="w-5 h-5 animate-spin text-[#8A1538]" />
                        ) : (
                          <UploadCloud className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">
                          إطار صورة النشاط رقم ({idx + 1})
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          توثيق تنفيذ الفعالية ومشاركة الطلاب
                        </span>
                      </div>

                      {canEdit && !isUploading && (
                        <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#8A1538] hover:text-[#72112E] bg-white border border-[#8A1538]/30 px-3 py-1 rounded-lg cursor-pointer hover:bg-[#8A1538]/5 transition-colors print:hidden shadow-2xs">
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>رفع صورة لهذا الإطار</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handlePhotoUpload(e, idx)}
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: ضوابط إرفاق الصور التوثيقية (9 Official Criteria) */}
        <div className="bg-slate-50 print:bg-transparent rounded-2xl border border-slate-200 print:border-slate-400 p-4 space-y-2 text-[11px] text-slate-700">
          <p className="font-bold text-slate-900 border-b border-slate-200 pb-1 text-xs">
            ضوابط إرفاق الصور التوثيقية المعتمدة:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
            <p>1. أن تكون الصور واضحة وحديثة ومرتبطة بالنشاط المنفذ.</p>
            <p>2. عدم تكرار الصور أو إرفاق صور غير معبرة عن التفعيل.</p>
            <p>3. إرفاق ما لا يقل عن أربع صور في الصفحة الواحدة.</p>
            <p>4. توضع صور أدلة النشاط أو البرنامج داخل الإطار المحدد.</p>
            <p>5. التقيد التام بالمساحات المخصصة للصور.</p>
            <p>6. صور توضح تكريم الجهة الخارجية / تكريم أو مشاركة ولي أمر إن وجد.</p>
            <p>7. أن توضح الصور تنفيذ النشاط ومشاركة الطلبة والوسائل المستخدمة.</p>
            <p>8. إبراز اشتراطات الأمن والسلامة، ومشاركة ولي الأمر أو الجهة الخارجية.</p>
            <p className="col-span-1 md:col-span-2 font-bold text-[#8A1538]">
              9. الالتزام التام بضوابط التصوير والنشر المعتمدة لدى وزارة التربية والتعليم.
            </p>
          </div>
        </div>

        {/* Section 4: الاعتمادات والتوقيعات الرسمية */}
        <div className="pt-8 border-t border-slate-300 print:border-black flex items-center justify-between px-10 text-xs font-bold break-inside-avoid">
          <div className="space-y-8 text-center min-w-[220px]">
            <p className="text-slate-800 text-sm">اخصائي الأنشطة</p>
            <p className="text-slate-500 font-mono text-[11px]">
              {supervisorName || "...................................................."}
            </p>
          </div>

          <div className="space-y-8 text-center min-w-[220px]">
            <p className="text-slate-800 text-sm">مدير المدرسة</p>
            <p className="text-slate-500 font-mono text-[11px]">
              {principalName || "...................................................."}
            </p>
          </div>
        </div>
      </div>

      {/* Edit Report Modal Dialog */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-lg text-slate-800">
                تعديل بيانات تقرير النشاط الرسمي ({activity.name})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">نوع النشاط</label>
                  <select
                    name="activity_type"
                    defaultValue={activityType}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="خطة معتمدة">خطة معتمدة</option>
                    <option value="مناسبة">مناسبة</option>
                    <option value="هوية وطنية">هوية وطنية</option>
                    <option value="قيم تربوية">قيم تربوية</option>
                    <option value="تعميم">تعميم</option>
                    {hasSchoolForm && (
                      <>
                        <option value="طلب إدراج">طلب إدراج</option>
                        <option value="خطط أقسام">خطط أقسام</option>
                        <option value="بحث علمي">بحث علمي</option>
                      </>
                    )}
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">إذا أخرى، اذكرها</label>
                  <input
                    type="text"
                    name="activity_type_other"
                    defaultValue={activityTypeOther}
                    placeholder="حدد نوع النشاط..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">طريقة تفعيل النشاط</label>
                  <select
                    name="activation_method"
                    defaultValue={activationMethod}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="فعالية">فعالية</option>
                    <option value="ورشة">ورشة</option>
                    <option value="مسابقة">مسابقة</option>
                    <option value="محاضرة">محاضرة</option>
                    <option value="رحلة">رحلة</option>
                    <option value="عن بُعد (افتراضي)">عن بُعد (افتراضي)</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>

                {hasSchoolForm ? (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">الفترة الزمنية</label>
                    <input
                      type="text"
                      name="time_period"
                      defaultValue={timePeriod}
                      placeholder="مثال: الحصة الأولى - الثالثة"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                ) : (
                  <input type="hidden" name="time_period" value={timePeriod} />
                )}

                <div>
                  <label className="font-bold text-slate-700 block mb-1">الفئة المستهدفة / المرحلة</label>
                  <input
                    type="text"
                    name="target_group"
                    defaultValue={targetGroup}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">القسم المسؤول</label>
                  <input
                    type="text"
                    name="responsible_department"
                    defaultValue={responsibleDepartment}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">الجهة الخارجية المنفذة</label>
                  <input
                    type="text"
                    name="external_entity"
                    defaultValue={externalEntity}
                    placeholder="—"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                {/* Only the specialist (petrol) form has these two fields */}
                {hasSpecialistForm ? (
                  <>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">تكريم الجهة الخارجية</label>
                      <select
                        name="external_honored"
                        defaultValue={externalHonored ? "true" : "false"}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        <option value="false">لا</option>
                        <option value="true">نعم</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">مشاركة أولياء الأمور</label>
                      <select
                        name="parent_participation"
                        defaultValue={parentParticipation ? "true" : "false"}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        <option value="false">لا</option>
                        <option value="true">نعم</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <input type="hidden" name="external_honored" value={externalHonored ? "true" : "false"} />
                    <input type="hidden" name="parent_participation" value={parentParticipation ? "true" : "false"} />
                  </>
                )}

                <div>
                  <label className="font-bold text-slate-700 block mb-1">مدى رضا الطلبة (1 إلى 5)</label>
                  <select
                    name="student_satisfaction"
                    defaultValue={studentSatisfaction.toString()}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="5">5 (راضٍ جداً)</option>
                    <option value="4">4 (راضٍ)</option>
                    <option value="3">3 (محايد)</option>
                    <option value="2">2 (غير راضٍ)</option>
                    <option value="1">1 (غير راض أبداً)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">جودة النشاط (1 إلى 5)</label>
                  <select
                    name="activity_quality"
                    defaultValue={activityQuality.toString()}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="5">5 (ممتاز / راضٍ جداً)</option>
                    <option value="4">4 (جيد جداً)</option>
                    <option value="3">3 (متوسط)</option>
                    <option value="2">2 (ضعيف)</option>
                    <option value="1">1 (غير مرضي)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">الهدف من النشاط</label>
                <textarea
                  name="objectives"
                  defaultValue={objectives}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">خطوات تنفيذ النشاط</label>
                <textarea
                  name="execution_steps"
                  defaultValue={executionSteps}
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">إجراءات الأمن والسلامة</label>
                <textarea
                  name="safety_measures"
                  defaultValue={safetyMeasures}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">التوصيات / المقترحات</label>
                <textarea
                  name="recommendations"
                  defaultValue={recommendations}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSaving}
                  className="bg-[#8A1538] hover:bg-[#72112E] text-white font-bold"
                >
                  {isSaving ? "جاري الحفظ..." : "حفظ بيانات التقرير"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Preview Modal for Documentation Photos */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs print:hidden"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3.5 border-b border-slate-100 bg-slate-50">
              <span className="text-xs font-bold text-slate-800 truncate">
                {previewPhoto.title}
              </span>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-slate-900/5 max-h-[75vh] overflow-auto">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.title}
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-sm"
              />
            </div>
            <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-end gap-2">
              <a
                href={previewPhoto.url}
                download
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8A1538] hover:underline px-3 py-1.5"
              >
                <Download className="w-4 h-4" />
                <span>تحميل الصورة الأصلية</span>
              </a>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewPhoto(null)}
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
