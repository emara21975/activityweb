import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { activityScopeWhere, canViewAllActivities } from "@/lib/auth/activity-scope";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getOfficialReportData, getNonParticipantsReport } from "@/lib/services/report-service";
import { getActivities } from "@/lib/services/activity-service";
import { getSchoolSettings } from "@/lib/services/school-settings-service";
import { getCurrentAcademicYear } from "@/lib/services/academic-year-service";
import {
  generateOfficialReportExcel,
  generateNonParticipantsExcel,
  generateActivitiesExcel,
} from "@/lib/services/excel-service";

export async function GET(request: Request) {
  const session = await getSession();

  if (!session || !session.user || !session.user.is_active) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const isSuperAdmin = session.user.roles.includes("SUPER_ADMIN");
  const canExport = isSuperAdmin || session.user.permissions.includes(PERMISSIONS.REPORT_EXPORT);

  if (!canExport) {
    return new NextResponse("Forbidden: ليس لديك صلاحية لتصدير التقارير.", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "stat";
  const yearId = searchParams.get("yearId") || undefined;
  const gradeId = searchParams.get("gradeId") || undefined;
  const sectionId = searchParams.get("sectionId") || undefined;
  const categoryId = searchParams.get("categoryId") || undefined;
  const period = searchParams.get("period") || undefined;
  const month = searchParams.get("month") || undefined;
  const date = searchParams.get("date") || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  // School-wide reports (stat, non-participants) need activity.view_all
  if (type !== "act" && !canViewAllActivities(session.user)) {
    return new NextResponse("Forbidden: هذا التقرير متاح لمن يملك صلاحية عرض جميع الأنشطة.", { status: 403 });
  }

  const [currentYear, schoolSettings] = await Promise.all([
    getCurrentAcademicYear(),
    getSchoolSettings(),
  ]);

  const schoolName = schoolSettings?.school_name_ar || "مدرسة عبد الله بن على المسند الثانوية للبنين";
  const academicYearName = currentYear?.name || "العام الدراسي الحالي";

  if (type === "non-participants") {
    const list = await getNonParticipantsReport(yearId);
    const buffer = await generateNonParticipantsExcel(list, schoolName, academicYearName);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="non_participants_${encodeURIComponent(
          academicYearName
        )}.xlsx"`,
      },
    });
  }

  if (type === "act") {
    const acts = await getActivities({
      academicYearId: yearId,
      from,
      to,
      scope: activityScopeWhere(session.user),
    });
    const items = acts.map((a) => ({
      activityDate: new Date(a.activity_date).toISOString().split("T")[0],
      name: a.name,
      categoryName: a.category.name_ar,
      totalParticipants: a.totalParticipants,
      qatariCount: a.qatariCount,
      nonQatariCount: a.nonQatariCount,
      status: a.status,
    }));

    const buffer = await generateActivitiesExcel(items, schoolName, academicYearName);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="activities_${encodeURIComponent(
          academicYearName
        )}.xlsx"`,
      },
    });
  }

  // Default: Official Statistical Report (stat)
  const reportData = await getOfficialReportData({
    academicYearId: yearId,
    gradeLevelId: gradeId,
    sectionId,
    categoryId,
    period,
    month,
    date,
    from,
    to,
  });

  const buffer = await generateOfficialReportExcel(reportData);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="official_report_${encodeURIComponent(
        reportData.academicYearName
      )}.xlsx"`,
    },
  });
}
