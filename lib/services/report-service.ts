import { prisma } from "../db/prisma";
import { getDashboardMetrics, resolveDateRange, StatisticsFilterOptions } from "./statistics-service";

export interface OfficialIndicatorRow {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  activitiesCount: number;
  qatariParticipations: number;
  nonQatariParticipations: number;
  totalParticipations: number;
  uniqueParticipants: number;
  participationRate: number;
  qatariRatio: number; // Ratio of qatari within unique participants
  nonQatariRatio: number;
}

export interface OfficialReportData {
  schoolName: string;
  academicYearName: string;
  generatedAt: string;
  periodLabel?: string;
  totalPopulation: number;
  uniqueParticipants: number;
  nonParticipants: number;
  totalParticipations: number;
  totalActivities: number;
  overallParticipationRate: number;
  qatariParticipants: number;
  nonQatariParticipants: number;
  unknownNationalityCount: number;
  rows: OfficialIndicatorRow[];
}

export function getPeriodDescription(options: StatisticsFilterOptions): string {
  if (options.period === "today") return "اليوم";
  if (options.period === "week") return "هذا الأسبوع";
  if (options.period === "month") return "الشهر الحالي";
  if (options.period === "term1") return "الفصل الدراسي الأول";
  if (options.period === "term2") return "الفصل الدراسي الثاني";
  if (options.period === "single_date" && options.date) return `يوم ${options.date}`;
  if (options.period === "custom" || (options.from && options.to)) {
    return `من ${options.from || "البداية"} إلى ${options.to || "الآن"}`;
  }
  let targetMonth = options.month;
  if (!targetMonth && options.period?.startsWith("month_")) {
    targetMonth = options.period.replace("month_", "");
  }
  if (targetMonth) {
    const monthNames: Record<string, string> = {
      "1": "شهر يناير (1)",
      "2": "شهر فبراير (2)",
      "3": "شهر مارس (3)",
      "4": "شهر أبريل (4)",
      "5": "شهر مايو (5)",
      "6": "شهر يونيو (6)",
      "7": "شهر يوليو (7)",
      "8": "شهر أغسطس (8)",
      "9": "شهر سبتمبر (9)",
      "10": "شهر أكتوبر (10)",
      "11": "شهر نوفمبر (11)",
      "12": "شهر ديسمبر (12)",
    };
    return monthNames[targetMonth] || `شهر (${targetMonth})`;
  }
  return "طوال العام الدراسي";
}

export async function getOfficialReportData(options: StatisticsFilterOptions = {}): Promise<OfficialReportData> {
  const currentSettings = await prisma.schoolSettings.findFirst({
    include: { current_academic_year: true },
  });

  const academicYearId = options.academicYearId || currentSettings?.current_academic_year_id;
  const currentYear = academicYearId
    ? await prisma.academicYear.findUnique({ where: { id: academicYearId } })
    : currentSettings?.current_academic_year;

  // Global KPIs from StatisticsService (Single Source of Truth)
  const metrics = await getDashboardMetrics({
    ...options,
    academicYearId: currentYear?.id,
  });

  const dateRange = resolveDateRange(options, currentYear);
  const periodLabel = getPeriodDescription(options);

  // Get categories and their activities + participations
  const categories = await prisma.activityCategory.findMany({
    orderBy: { sort_order: "asc" },
    include: {
      activities: {
        where: {
          archived_at: null,
          ...(currentYear?.id ? { academic_year_id: currentYear.id } : {}),
          ...(dateRange
            ? {
                activity_date: {
                  ...(dateRange.gte ? { gte: dateRange.gte } : {}),
                  ...(dateRange.lte ? { lte: dateRange.lte } : {}),
                },
              }
            : {}),
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

  const rows: OfficialIndicatorRow[] = categories.map((cat) => {
    const activitiesCount = cat.activities.length;
    let qatariParticipations = 0;
    let nonQatariParticipations = 0;
    let totalParticipations = 0;
    const uniqueStudents = new Map<string, string | null>();

    for (const act of cat.activities) {
      for (const p of act.participations) {
        totalParticipations++;
        if (!uniqueStudents.has(p.student.id)) {
          uniqueStudents.set(p.student.id, p.student.nationality_group);
        }
        if (p.student.nationality_group === "QATARI") qatariParticipations++;
        else if (p.student.nationality_group === "NON_QATARI") nonQatariParticipations++;
      }
    }

    const uniqueParticipantsCount = uniqueStudents.size;
    const participationRate =
      metrics.totalPopulation > 0
        ? Number(((uniqueParticipantsCount / metrics.totalPopulation) * 100).toFixed(2))
        : 0;

    let uniqueQatari = 0;
    let uniqueNonQatari = 0;
    for (const nat of uniqueStudents.values()) {
      if (nat === "QATARI") uniqueQatari++;
      else if (nat === "NON_QATARI") uniqueNonQatari++;
    }

    const qatariRatio =
      uniqueParticipantsCount > 0
        ? Number(((uniqueQatari / uniqueParticipantsCount) * 100).toFixed(2))
        : 0;

    const nonQatariRatio =
      uniqueParticipantsCount > 0
        ? Number(((uniqueNonQatari / uniqueParticipantsCount) * 100).toFixed(2))
        : 0;

    return {
      categoryId: cat.id,
      categoryCode: cat.code,
      categoryName: cat.name_ar,
      activitiesCount,
      qatariParticipations,
      nonQatariParticipations,
      totalParticipations,
      uniqueParticipants: uniqueParticipantsCount,
      participationRate,
      qatariRatio,
      nonQatariRatio,
    };
  });

  return {
    schoolName: currentSettings?.school_name_ar || "مدرسة قطر للتعليم الثانوي",
    academicYearName: currentYear?.name || "العام الحالي",
    generatedAt: new Date().toLocaleString("ar-QA"),
    periodLabel,
    totalPopulation: metrics.totalPopulation,
    uniqueParticipants: metrics.uniqueParticipants,
    nonParticipants: metrics.nonParticipants,
    totalParticipations: metrics.totalParticipations,
    totalActivities: metrics.totalActivities,
    overallParticipationRate: metrics.participationRate,
    qatariParticipants: metrics.qatariParticipants,
    nonQatariParticipants: metrics.nonQatariParticipants,
    unknownNationalityCount: metrics.unknownNationalityParticipants,
    rows,
  };
}

export async function getNonParticipantsReport(academicYearId?: string) {
  // 1. Get population of students enrolled in this year
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      status: "ACTIVE",
      ...(academicYearId ? { academic_year_id: academicYearId } : {}),
    },
    include: {
      student: true,
      class_group: {
        include: {
          grade_level: true,
          section: true,
        },
      },
    },
    orderBy: { student: { full_name_ar: "asc" } },
  });

  // 2. Get all student IDs that have at least one participation in this academic year
  const participations = await prisma.participation.findMany({
    where: {
      activity: {
        archived_at: null,
        ...(academicYearId ? { academic_year_id: academicYearId } : {}),
      },
    },
    select: { student_id: true },
    distinct: ["student_id"],
  });

  const participatingIds = new Set(participations.map((p) => p.student_id));

  // Filter students with no participations
  const nonParticipants = enrollments.filter((e) => !participatingIds.has(e.student_id));

  return nonParticipants.map((enr, idx) => ({
    serial: idx + 1,
    studentId: enr.student.id,
    academicNumber: enr.student.academic_number || "—",
    fullName: enr.student.full_name_ar,
    nationality: enr.student.nationality_group === "QATARI" ? "قطري" : enr.student.nationality || "غير قطري",
    gradeName: enr.class_group.grade_level.name_ar,
    sectionName: enr.class_group.section.name,
  }));
}
