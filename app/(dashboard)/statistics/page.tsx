import React from "react";
import { getDashboardMetrics } from "@/lib/services/statistics-service";
import { getCurrentAcademicYear } from "@/lib/services/academic-year-service";
import { getSchoolSettings } from "@/lib/services/school-settings-service";
import { prisma } from "@/lib/db/prisma";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Flag, Globe, Users } from "lucide-react";
import { PrintActionBar } from "@/components/reports/PrintActionBar";
import { OfficialPrintHeader } from "@/components/reports/OfficialPrintHeader";
import { OfficialPrintFooter } from "@/components/reports/OfficialPrintFooter";
import { ReportsNav } from "@/components/reports/ReportsNav";
import { getSession } from "@/lib/auth/session";
import { activityScopeWhere, canViewAllActivities } from "@/lib/auth/activity-scope";

export default async function StatisticsPage() {
  const session = await getSession();
  const [currentYear, schoolSettings] = await Promise.all([
    getCurrentAcademicYear(),
    getSchoolSettings(),
  ]);

  const schoolName = schoolSettings?.school_name_ar || "مدرسة عبد الله بن علي المسند الثانوية للبنين";
  const academicYearName = currentYear?.name || "2026-2027";
  const excelExportUrl = `/api/reports/export/excel?type=${canViewAllActivities(session?.user) ? "stat" : "act"}${currentYear?.id ? `&yearId=${currentYear.id}` : ""}`;

  const activityScope = session?.user ? activityScopeWhere(session.user) : { id: "__none__" };
  const metrics = await getDashboardMetrics({ academicYearId: currentYear?.id, activityScope });

  // Fetch breakdown per activity category
  const categories = await prisma.activityCategory.findMany({
    orderBy: { sort_order: "asc" },
    include: {
      activities: {
        where: {
          archived_at: null,
          ...(currentYear?.id ? { academic_year_id: currentYear.id } : {}),
          AND: [activityScope],
        },
        include: {
          participations: {
            include: {
              student: {
                select: {
                  id: true,
                  nationality_group: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const categoryStats = categories.map((cat) => {
    let actCount = cat.activities.length;
    let participationsCount = 0;
    const uniqueStudentIds = new Set<string>();
    let qatariCount = 0;
    let nonQatariCount = 0;

    for (const act of cat.activities) {
      for (const p of act.participations) {
        participationsCount++;
        uniqueStudentIds.add(p.student.id);
        if (p.student.nationality_group === "QATARI") qatariCount++;
        else if (p.student.nationality_group === "NON_QATARI") nonQatariCount++;
      }
    }

    const catParticipationRate =
      metrics.totalPopulation > 0
        ? Number(((uniqueStudentIds.size / metrics.totalPopulation) * 100).toFixed(2))
        : 0;

    return {
      id: cat.id,
      name_ar: cat.name_ar,
      actCount,
      participationsCount,
      uniqueCount: uniqueStudentIds.size,
      qatariCount,
      nonQatariCount,
      rate: catParticipationRate,
    };
  });

  return (
    <div className="space-y-6">
      <ReportsNav canViewAll={canViewAllActivities(session?.user)} />

      {/* Top Action Bar (Print HTML / PDF + Excel export + Back) */}
      <PrintActionBar
        title="المؤشرات الإحصائية الرسمية (Statistics)"
        subtitle={`${schoolName} — العام الدراسي: ${academicYearName}`}
        excelUrl={excelExportUrl}
      />

      {/* Official Printable Container */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs print:p-0 print:border-none print:shadow-none space-y-6">
        {/* Official State of Qatar & Ministry Header */}
        <OfficialPrintHeader
          schoolName={schoolName}
          academicYearName={academicYearName}
          reportTitle="تقرير المؤشرات الإحصائية الرسمية لأداء الأنشطة المدرسية"
          subtitle={`العام الدراسي ${academicYearName} • مؤشرات قياس الأداء الوطنية`}
        />

        {/* Screen Only Subheading */}
        <div className="pb-2 border-b border-slate-100 print:hidden">
          <h2 className="text-lg font-black text-slate-800 tracking-tight">
            ملخص مؤشرات الإنجاز العامة
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            بيان إحصائي تفصيلي يوضح أداء الأنشطة ونسب المشاركة حسب التصنيفات والجنسية
          </p>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
          <Card className="p-4 bg-white border border-slate-200 print:border-slate-300 print:p-2.5">
            <span className="text-xs font-bold text-slate-500 print:text-[10px]">إجمالي طلاب المدرسة</span>
            <p className="text-2xl font-black text-slate-800 mt-2 print:text-lg print:mt-1">{metrics.totalPopulation}</p>
          </Card>

          <Card className="p-4 bg-white border-l-4 border-l-emerald-600 border border-slate-200 print:border-slate-300 print:p-2.5">
            <span className="text-xs font-bold text-emerald-800 print:text-[10px]">المشاركون الفريدون</span>
            <p className="text-2xl font-black text-emerald-700 mt-2 print:text-lg print:mt-1">{metrics.uniqueParticipants}</p>
          </Card>

          <Card className="p-4 bg-white border-l-4 border-l-[#8A1538] border border-slate-200 print:border-slate-300 print:p-2.5">
            <span className="text-xs font-bold text-[#8A1538] print:text-[10px]">نسبة المشاركة المعتمدة</span>
            <p className="text-2xl font-black text-[#8A1538] mt-2 print:text-lg print:mt-1">{metrics.participationRate}%</p>
          </Card>

          <Card className="p-4 bg-white border-l-4 border-l-rose-500 border border-slate-200 print:border-slate-300 print:p-2.5">
            <span className="text-xs font-bold text-rose-700 print:text-[10px]">غير المشاركين</span>
            <p className="text-2xl font-black text-rose-700 mt-2 print:text-lg print:mt-1">{metrics.nonParticipants}</p>
          </Card>
        </div>

        {/* Official Indicators Breakdown Table */}
        <Card className="p-0 overflow-hidden border border-slate-200 print:border-slate-300 shadow-none">
          <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between print:py-2 print:px-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#8A1538] print:w-4 print:h-4" />
              <CardTitle className="text-sm font-black print:text-xs">جدول مؤشرات تصنيفات الأنشطة المدرسية</CardTitle>
            </div>
            <Badge variant="maroon" className="print:hidden">العام الحالي: {academicYearName}</Badge>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs print:text-[11px]">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 print:bg-slate-100 print:text-black">
                <tr>
                  <th className="py-3 px-4 print:py-1.5 print:px-2">م</th>
                  <th className="py-3 px-4 print:py-1.5 print:px-2">تصنيف النشاط</th>
                  <th className="py-3 px-4 text-center print:py-1.5 print:px-2">الأنشطة</th>
                  <th className="py-3 px-4 text-center print:py-1.5 print:px-2">قطري</th>
                  <th className="py-3 px-4 text-center print:py-1.5 print:px-2">غير قطري</th>
                  <th className="py-3 px-4 text-center print:py-1.5 print:px-2">إجمالي المشاركات</th>
                  <th className="py-3 px-4 text-center print:py-1.5 print:px-2">الطلاب الفريدون</th>
                  <th className="py-3 px-4 text-center print:py-1.5 print:px-2">نسبة المشاركة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium print:divide-slate-200">
                {categoryStats.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-400 font-bold print:py-1.5 print:px-2 print:text-slate-600">{idx + 1}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 print:py-1.5 print:px-2">{c.name_ar}</td>
                    <td className="py-3.5 px-4 text-center text-slate-700 print:py-1.5 print:px-2">{c.actCount}</td>
                    <td className="py-3.5 px-4 text-center text-[#8A1538] font-bold print:py-1.5 print:px-2">
                      {c.qatariCount}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-600 font-bold print:py-1.5 print:px-2">
                      {c.nonQatariCount}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800 print:py-1.5 print:px-2">
                      {c.participationsCount}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-700 print:py-1.5 print:px-2">
                      {c.uniqueCount}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800 print:py-1.5 print:px-2">
                      {c.rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Totals Footer */}
              <tfoot className="bg-slate-100/80 font-bold text-slate-800 border-t-2 border-slate-200 print:bg-slate-100 print:text-black">
                <tr>
                  <td colSpan={2} className="py-3 px-4 text-sm font-black print:py-1.5 print:px-2 print:text-xs">
                    المجموع العام
                  </td>
                  <td className="py-3 px-4 text-center font-black print:py-1.5 print:px-2">{metrics.totalActivities}</td>
                  <td className="py-3 px-4 text-center font-black text-[#8A1538] print:py-1.5 print:px-2">
                    {metrics.qatariParticipants}
                  </td>
                  <td className="py-3 px-4 text-center font-black text-slate-700 print:py-1.5 print:px-2">
                    {metrics.nonQatariParticipants}
                  </td>
                  <td className="py-3 px-4 text-center font-black print:py-1.5 print:px-2">{metrics.totalParticipations}</td>
                  <td className="py-3 px-4 text-center font-black text-emerald-800 print:py-1.5 print:px-2">
                    {metrics.uniqueParticipants}
                  </td>
                  <td className="py-3 px-4 text-center font-black text-[#8A1538] print:py-1.5 print:px-2">
                    {metrics.participationRate}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* Official Signatures & Stamp Footer */}
        <OfficialPrintFooter />
      </div>
    </div>
  );
}
