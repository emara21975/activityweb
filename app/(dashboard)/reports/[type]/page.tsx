import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { activityScopeWhere, canViewAllActivities } from "@/lib/auth/activity-scope";
import { getCurrentAcademicYear, getAcademicYears } from "@/lib/services/academic-year-service";
import { getOfficialReportData, getNonParticipantsReport } from "@/lib/services/report-service";
import { getStudents } from "@/lib/services/student-service";
import { getActivities } from "@/lib/services/activity-service";
import { getSchoolSettings } from "@/lib/services/school-settings-service";
import { OfficialReportViewer } from "@/components/reports/OfficialReportViewer";
import { ReportsNav } from "@/components/reports/ReportsNav";
import { PrintActionBar } from "@/components/reports/PrintActionBar";
import { OfficialPrintHeader } from "@/components/reports/OfficialPrintHeader";
import { OfficialPrintFooter } from "@/components/reports/OfficialPrintFooter";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, UserX, Printer, Users, CalendarDays, Award } from "lucide-react";

interface ReportPageProps {
  params: Promise<{ type: string }>;
  searchParams: Promise<{
    yearId?: string;
    period?: string;
    month?: string;
    date?: string;
    from?: string;
    to?: string;
    gradeId?: string;
    sectionId?: string;
    categoryId?: string;
  }>;
}

export default async function ReportDetailPage({ params, searchParams }: ReportPageProps) {
  const { type } = await params;
  const sParams = await searchParams;
  const [currentYear, schoolSettings, academicYears, session] = await Promise.all([
    getCurrentAcademicYear(),
    getSchoolSettings(),
    getAcademicYears(),
    getSession(),
  ]);

  // School-wide reports are only for users who see every activity
  const canViewAll = canViewAllActivities(session?.user);
  if (!canViewAll && (type === "stat" || type === "non-participants")) {
    redirect("/reports/act");
  }

  const yearId = sParams.yearId || currentYear?.id;
  const schoolName = schoolSettings?.school_name_ar || "مدرسة عبد الله بن علي المسند الثانوية للبنين";
  const academicYearName = currentYear?.name || "2026-2027";

  if (type === "stat") {
    const reportData = await getOfficialReportData({
      academicYearId: yearId,
      period: sParams.period,
      month: sParams.month,
      date: sParams.date,
      from: sParams.from,
      to: sParams.to,
      gradeLevelId: sParams.gradeId,
      sectionId: sParams.sectionId,
      categoryId: sParams.categoryId,
    });
    return (
      <div className="space-y-6">
        <ReportsNav canViewAll={canViewAll} />
        <OfficialReportViewer
          data={reportData}
          academicYears={academicYears}
          selectedYearId={yearId || ""}
          filters={{
            period: sParams.period || "",
            month: sParams.month || "",
            date: sParams.date || "",
            from: sParams.from || "",
            to: sParams.to || "",
            yearId: yearId || "",
          }}
        />
      </div>
    );
  }

  if (type === "non-participants") {
    const nonParticipants = await getNonParticipantsReport(yearId);
    const excelUrl = `/api/reports/export/excel?type=non-participants${yearId ? `&yearId=${yearId}` : ""}`;

    return (
      <div className="space-y-6">
        <ReportsNav canViewAll={canViewAll} />

        {/* Print & Action Bar */}
        <PrintActionBar
          title="تقرير الطلاب غير المشاركين في الأنشطة"
          subtitle={`${schoolName} — العام الدراسي: ${academicYearName}`}
          excelUrl={excelUrl}
        />

        {/* Printable Official Document Container */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs print:p-0 print:border-none print:shadow-none space-y-6">
          <OfficialPrintHeader
            schoolName={schoolName}
            reportTitle="تقرير الطلاب غير المشاركين"
            academicYearName={academicYearName}
            subtitle="حصر ومتابعة الطلاب غير المسجلين بأي نشاط مدرسي حتى تاريخه"
          />

          {/* Quick Summary Pill */}
          <div className="flex items-center justify-between p-4 bg-red-50/60 border border-red-200/80 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold text-sm">
                !
              </span>
              <div>
                <span className="font-bold text-sm text-red-950 block">حصر فئة المتابعة الطلابية</span>
                <span className="text-xs text-red-700">الطلاب المدرجون أدناه بحاجة لخطة تحفيز وإشراك في الأنشطة القادمة</span>
              </div>
            </div>
            <div className="text-left font-mono">
              <span className="text-2xl font-black text-red-700">{nonParticipants.length}</span>
              <span className="text-xs text-red-600 block font-sans">طالب غير مشارك</span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#8A1538] text-white font-bold">
                <tr>
                  <th className="py-3 px-3 w-12 text-center border-l border-white/20">م</th>
                  <th className="py-3 px-4 border-l border-white/20">الرقم الأكاديمي</th>
                  <th className="py-3 px-4 border-l border-white/20">اسم الطالب الكامل</th>
                  <th className="py-3 px-4 border-l border-white/20 text-center">الجنسية</th>
                  <th className="py-3 px-4 border-l border-white/20 text-center">الصف الدراسي</th>
                  <th className="py-3 px-4 border-l border-white/20 text-center">الشعبة</th>
                  <th className="py-3 px-4 text-center print:hidden">الملف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {nonParticipants.map((stu) => (
                  <tr key={stu.studentId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-bold border-l border-slate-100">
                      {stu.serial}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-700 border-l border-slate-100">
                      {stu.academicNumber}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 border-l border-slate-100">
                      {stu.fullName}
                    </td>
                    <td className="py-2.5 px-4 text-center border-l border-slate-100">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        stu.nationality === "قطري" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"
                      }`}>
                        {stu.nationality}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center text-slate-700 border-l border-slate-100">
                      {stu.gradeName}
                    </td>
                    <td className="py-2.5 px-4 text-center text-slate-700 border-l border-slate-100">
                      شعبة {stu.sectionName}
                    </td>
                    <td className="py-2.5 px-4 text-center print:hidden">
                      <Link href={`/students/${stu.studentId}`}>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                          الملف
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <OfficialPrintFooter />
        </div>
      </div>
    );
  }

  if (type === "act") {
    const activities = await getActivities({
      academicYearId: yearId,
      scope: session?.user ? activityScopeWhere(session.user) : { id: "__none__" },
    });
    const totalParticipants = activities.reduce((acc, a) => acc + a.totalParticipants, 0);
    const totalQatari = activities.reduce((acc, a) => acc + a.qatariCount, 0);
    const totalNonQatari = activities.reduce((acc, a) => acc + a.nonQatariCount, 0);

    const excelUrl = `/api/reports/export/excel?type=act${yearId ? `&yearId=${yearId}` : ""}`;

    return (
      <div className="space-y-6">
        <ReportsNav canViewAll={canViewAll} />

        {/* Print & Action Bar */}
        <PrintActionBar
          title="تقرير الأنشطة والفعاليات المدرسية المنفذة (act)"
          subtitle={`${schoolName} — العام الدراسي: ${academicYearName}`}
          excelUrl={excelUrl}
        />

        {/* Printable Official Document Container */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs print:p-0 print:border-none print:shadow-none space-y-6">
          <OfficialPrintHeader
            schoolName={schoolName}
            reportTitle="تقرير الأنشطة المدرسية المنفذة"
            academicYearName={academicYearName}
            subtitle="بيان شامل بالأنشطة والفعاليات المنفذة وأعداد الطلاب المشاركين"
          />

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[11px] font-bold text-slate-500 block">إجمالي الأنشطة</span>
              <span className="text-xl font-black text-slate-800">{activities.length}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[11px] font-bold text-slate-500 block">إجمالي المشاركات</span>
              <span className="text-xl font-black text-slate-800">{totalParticipants}</span>
            </div>

            <div className="p-3 bg-[#8A1538]/5 rounded-xl border border-[#8A1538]/20 text-center">
              <span className="text-[11px] font-bold text-[#8A1538] block">المشاركون القطريون</span>
              <span className="text-xl font-black text-[#8A1538]">{totalQatari}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[11px] font-bold text-slate-500 block">المشاركون غير القطريين</span>
              <span className="text-xl font-black text-slate-700">{totalNonQatari}</span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#8A1538] text-white font-bold">
                <tr>
                  <th className="py-3 px-3 w-10 text-center border-l border-white/20">م</th>
                  <th className="py-3 px-4 border-l border-white/20">تاريخ النشاط</th>
                  <th className="py-3 px-4 border-l border-white/20">اسم النشاط والفعالية</th>
                  <th className="py-3 px-4 border-l border-white/20">التصنيف المعتمد</th>
                  <th className="py-3 px-4 text-center border-l border-white/20">إجمالي المشاركين</th>
                  <th className="py-3 px-4 text-center border-l border-white/20">قطري</th>
                  <th className="py-3 px-4 text-center border-l border-white/20">غير قطري</th>
                  <th className="py-3 px-4 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {activities.map((act, idx) => (
                  <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-bold border-l border-slate-100">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600 border-l border-slate-100">
                      {new Date(act.activity_date).toISOString().split("T")[0]}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 border-l border-slate-100">
                      {act.name}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 border-l border-slate-100">
                      {act.category.name_ar}
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold text-slate-800 border-l border-slate-100">
                      {act.totalParticipants}
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold text-[#8A1538] border-l border-slate-100">
                      {act.qatariCount}
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold text-slate-600 border-l border-slate-100">
                      {act.nonQatariCount}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        act.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {act.status === "COMPLETED" ? "منفذ" : "مخطط"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <OfficialPrintFooter />
        </div>
      </div>
    );
  }

  // Fallback for other report types
  notFound();
}
