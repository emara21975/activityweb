import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActivityById } from "@/lib/services/activity-service";
import { getSchoolSettings } from "@/lib/services/school-settings-service";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/ui/PrintButton";
import { OfficialPrintHeader } from "@/components/reports/OfficialPrintHeader";
import { OfficialPrintFooter } from "@/components/reports/OfficialPrintFooter";
import { removeParticipationAction } from "@/app/actions/participation-actions";
import { getSession } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ActivityAttachments } from "@/components/activities/activity-attachments";
import { OfficialActivityReport } from "@/components/activities/OfficialActivityReport";
import { ActivityVideoDocumentation } from "@/components/activities/ActivityVideoDocumentation";
import {
  ArrowRight,
  Calendar,
  UserCheck,
  Flag,
  Globe,
  Plus,
  Trash2,
  Tag,
  Clock,
  Users,
  FileText,
  Image as ImageIcon,
} from "lucide-react";

interface ActivityDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ActivityDetailsPage({ params }: ActivityDetailsPageProps) {
  const { id } = await params;
  const [activity, schoolSettings] = await Promise.all([
    getActivityById(id),
    getSchoolSettings(),
  ]);

  if (!activity) {
    notFound();
  }

  const schoolName = schoolSettings?.school_name_ar || "مدرسة عبد الله بن علي المسند الثانوية للبنين";

  const session = await getSession();
  const isSuperAdmin = session?.user?.roles.includes("SUPER_ADMIN") || false;
  const canUpload = isSuperAdmin || (session?.user?.permissions.includes(PERMISSIONS.ATTACHMENT_UPLOAD) ?? false);
  const canRemove = isSuperAdmin || (session?.user?.permissions.includes(PERMISSIONS.ATTACHMENT_REMOVE) ?? false);

  return (
    <div className="space-y-8">
      {/* Breadcrumb (Screen Only) */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium print:hidden">
        <Link href="/activities" className="hover:text-slate-800 flex items-center gap-1">
          <ArrowRight className="w-3.5 h-3.5" />
          <span>الأنشطة المدرسية</span>
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-bold">{activity.name}</span>
      </div>

      {/* Official Activity Report (Matching Word doc 100%) */}
      <OfficialActivityReport
        activity={activity}
        schoolName={schoolName}
        canEdit={isSuperAdmin || canUpload || canRemove}
      />

      {/* Participants & Management (Hidden during Print of the Official Report) */}
      <div className="print:hidden space-y-6 pt-6 border-t-2 border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#8A1538]" />
            <h3 className="text-lg font-black text-slate-800">
              سجل الطلاب المشاركين في النشاط ({activity.participations.length})
            </h3>
          </div>

          <Link href={`/participations?activityId=${activity.id}`}>
            <Button variant="gold" size="sm" className="font-bold gap-1.5 shadow-sm">
              <Plus className="w-4 h-4" />
              <span>تسجيل مشاركات طلاب في الفعالية</span>
            </Button>
          </Link>
        </div>

        {/* Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي المشاركين</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2">
            {activity.totalParticipants} طالب
          </p>
        </Card>

        <Card className="p-4 bg-white border-l-4 border-l-[#8A1538]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8A1538]">المشاركون القطريون</span>
            <Flag className="w-4 h-4 text-[#8A1538]" />
          </div>
          <p className="text-2xl font-black text-[#8A1538] mt-2">
            {activity.qatariCount} طالب
          </p>
        </Card>

        <Card className="p-4 bg-white border-l-4 border-l-slate-400">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">المشاركون غير القطريين</span>
            <Globe className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2">
            {activity.nonQatariCount} طالب
          </p>
        </Card>
      </div>

      {/* Participants Table */}
      <Card className="p-0 overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle>قائمة الطلاب المشاركين في هذا النشاط</CardTitle>
            <CardDescription>
              الطلاب الذين تم توثيق مشاركتهم الفعلية في الفعالية
            </CardDescription>
          </div>
          <Badge variant="maroon">{activity.participations.length} مشارك</Badge>
        </CardHeader>

        {activity.participations.length === 0 ? (
          <div className="text-center py-16 text-slate-400 space-y-3">
            <UserCheck className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-semibold">لم يتم تسجيل أي طالب في هذا النشاط بعد.</p>
            <Link href={`/participations?activityId=${activity.id}`}>
              <Button size="sm" variant="gold">
                تسجيل المشاركات الجماعية الآن
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">م</th>
                  <th className="py-3 px-4">الرقم الأكاديمي</th>
                  <th className="py-3 px-4">اسم الطالب</th>
                  <th className="py-3 px-4">الجنسية</th>
                  <th className="py-3 px-4">الصف وقت النشاط</th>
                  <th className="py-3 px-4">الشعبة</th>
                  <th className="py-3 px-4 text-center">إلغاء المشاركة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {activity.participations.map((p, idx) => {
                  const gradeName = p.enrollment?.class_group.grade_level.name_ar || "—";
                  const sectionName = p.enrollment?.class_group.section.name || "—";

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400 font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {p.student.academic_number || "—"}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <Link
                          href={`/students/${p.student_id}`}
                          className="hover:text-[#8A1538] transition-colors"
                        >
                          {p.student.full_name_ar}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        {p.student.nationality_group === "QATARI" ? (
                          <Badge variant="maroon">قطري</Badge>
                        ) : (
                          <Badge variant="neutral">{p.student.nationality || "غير قطري"}</Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">{gradeName}</td>
                      <td className="py-3.5 px-4 text-slate-700">{sectionName}</td>
                      <td className="py-3.5 px-4 text-center">
                        <form
                          action={removeParticipationAction.bind(null, p.id, activity.id)}
                        >
                          <Button
                            type="submit"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-rose-600 hover:bg-rose-50"
                            title="إلغاء المشاركة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Video Documentation Section (Hidden during print & Word export) */}
      <ActivityVideoDocumentation
        activityId={activity.id}
        initialVideoUrl={(() => {
          if (!activity.notes) return null;
          try {
            const data = JSON.parse(activity.notes);
            return data.video_url || null;
          } catch {
            return null;
          }
        })()}
        canEdit={canUpload || isSuperAdmin}
      />

      {/* Attachments Section (Hidden during print) */}
      <ActivityAttachments
        activityId={activity.id}
        attachments={activity.attachments}
        canUpload={canUpload}
        canRemove={canRemove}
      />
      </div>
    </div>
  );
}
