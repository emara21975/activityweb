import { prisma } from "../db/prisma";
import { getSchoolSettings } from "./school-settings-service";
import { Prisma } from "@prisma/client";

export interface StatisticsFilterOptions {
  academicYearId?: string;
  gradeLevelId?: string;
  sectionId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
  period?: string; // "today" | "week" | "month" | "specific_month" | "term1" | "term2" | "year" | "custom" | "single_date"
  date?: string; // for single date
  month?: string; // "1" to "12" or "YYYY-MM"
}

export function resolveDateRange(
  options: StatisticsFilterOptions,
  academicYear?: {
    start_date: Date;
    end_date: Date;
    term1_start_date?: Date | null;
    term1_end_date?: Date | null;
    term2_start_date?: Date | null;
    term2_end_date?: Date | null;
  } | null
): { gte?: Date; lte?: Date } | null {
  const now = new Date();

  if (options.period === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  if (options.period === "week") {
    const day = now.getDay(); // 0 is Sunday in Qatar/Middle East
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, 0, 0, 0, 0);
    const end = new Date(start.getTime() + 6 * 86400000);
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  if (options.period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  // Specific Month (e.g. options.month = "1" to "12" or options.period = "month_10" or "specific_month")
  let targetMonthNum: number | null = null;
  if (options.month) {
    targetMonthNum = parseInt(options.month, 10);
  } else if (options.period?.startsWith("month_")) {
    targetMonthNum = parseInt(options.period.replace("month_", ""), 10);
  }

  if (targetMonthNum && targetMonthNum >= 1 && targetMonthNum <= 12) {
    let year = now.getFullYear();
    if (academicYear) {
      const startYear = new Date(academicYear.start_date).getFullYear();
      const endYear = new Date(academicYear.end_date).getFullYear();
      // Months 8-12 belong to start year of academic session, months 1-7 belong to end year
      year = targetMonthNum >= 8 ? startYear : endYear;
    }
    const monthIndex = targetMonthNum - 1;
    const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
    const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  if (options.period === "term1" && academicYear) {
    if (academicYear.term1_start_date && academicYear.term1_end_date) {
      const start = new Date(academicYear.term1_start_date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(academicYear.term1_end_date);
      end.setHours(23, 59, 59, 999);
      return { gte: start, lte: end };
    }
    const start = new Date(academicYear.start_date);
    const midTime = (academicYear.start_date.getTime() + academicYear.end_date.getTime()) / 2;
    const end = new Date(midTime);
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  if (options.period === "term2" && academicYear) {
    if (academicYear.term2_start_date && academicYear.term2_end_date) {
      const start = new Date(academicYear.term2_start_date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(academicYear.term2_end_date);
      end.setHours(23, 59, 59, 999);
      return { gte: start, lte: end };
    }
    const midTime = (academicYear.start_date.getTime() + academicYear.end_date.getTime()) / 2;
    const start = new Date(midTime);
    const end = new Date(academicYear.end_date);
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  if (options.period === "single_date" && options.date) {
    const d = new Date(options.date);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  if (options.from || options.to) {
    const res: { gte?: Date; lte?: Date } = {};
    if (options.from) {
      const f = new Date(options.from);
      res.gte = new Date(f.getFullYear(), f.getMonth(), f.getDate(), 0, 0, 0, 0);
    }
    if (options.to) {
      const t = new Date(options.to);
      res.lte = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59, 999);
    }
    return res;
  }

  return null;
}

export interface DashboardMetrics {
  totalPopulation: number;
  uniqueParticipants: number;
  nonParticipants: number;
  totalParticipations: number;
  totalActivities: number;
  participationRate: number;
  qatariParticipants: number;
  nonQatariParticipants: number;
  unknownNationalityParticipants: number;
}

export async function getDashboardMetrics(options: StatisticsFilterOptions = {}): Promise<DashboardMetrics> {
  // 1. Determine active academic year if not provided
  let academicYearId = options.academicYearId;
  let currentAcademicYear: { id: string; start_date: Date; end_date: Date } | null = null;
  if (!academicYearId) {
    const currentYear = await prisma.academicYear.findFirst({ where: { is_current: true } });
    academicYearId = currentYear?.id;
    currentAcademicYear = currentYear;
  } else {
    currentAcademicYear = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
  }

  // 2. Compute Population: Eligible active students in the academic year & class group
  const enrollmentWhere: Prisma.StudentEnrollmentWhereInput = {
    status: "ACTIVE",
    ...(academicYearId ? { academic_year_id: academicYearId } : {}),
  };

  if (options.gradeLevelId || options.sectionId) {
    enrollmentWhere.class_group = {
      ...(options.gradeLevelId ? { grade_level_id: options.gradeLevelId } : {}),
      ...(options.sectionId ? { section_id: options.sectionId } : {}),
    };
  }

  // Fetch unique active student IDs in this population
  const populationEnrollments = await prisma.studentEnrollment.findMany({
    where: enrollmentWhere,
    select: { student_id: true },
    distinct: ["student_id"],
  });

  const populationStudentIds = populationEnrollments.map((e) => e.student_id);
  const totalPopulation = populationStudentIds.length;

  // 3. Count activities in scope
  const activityWhere: Prisma.ActivityWhereInput = {
    archived_at: null,
    ...(academicYearId ? { academic_year_id: academicYearId } : {}),
    ...(options.categoryId ? { category_id: options.categoryId } : {}),
  };

  const dateRange = resolveDateRange(options, currentAcademicYear);
  if (dateRange) {
    activityWhere.activity_date = dateRange;
  }

  const totalActivities = await prisma.activity.count({ where: activityWhere });

  // 4. Fetch Participations in scope
  const participationWhere: Prisma.ParticipationWhereInput = {
    activity: activityWhere,
  };

  // If population filter applied, restrict participations to students within population
  if (options.gradeLevelId || options.sectionId) {
    participationWhere.student_id = { in: populationStudentIds };
  }

  const participations = await prisma.participation.findMany({
    where: participationWhere,
    include: {
      student: {
        select: {
          id: true,
          nationality_group: true,
        },
      },
    },
  });

  const totalParticipations = participations.length;

  // 5. Unique Participants calculation
  const uniqueStudentMap = new Map<string, string | null>();
  for (const p of participations) {
    if (!uniqueStudentMap.has(p.student.id)) {
      uniqueStudentMap.set(p.student.id, p.student.nationality_group);
    }
  }

  const uniqueParticipants = uniqueStudentMap.size;
  const nonParticipants = Math.max(0, totalPopulation - uniqueParticipants);

  let qatariParticipants = 0;
  let nonQatariParticipants = 0;
  let unknownNationalityParticipants = 0;

  for (const natGroup of uniqueStudentMap.values()) {
    if (natGroup === "QATARI") {
      qatariParticipants++;
    } else if (natGroup === "NON_QATARI") {
      nonQatariParticipants++;
    } else {
      unknownNationalityParticipants++;
    }
  }

  // Participation rate = 100 * uniqueParticipants / totalPopulation
  const participationRate =
    totalPopulation > 0
      ? Number(((uniqueParticipants / totalPopulation) * 100).toFixed(2))
      : 0;

  return {
    totalPopulation,
    uniqueParticipants,
    nonParticipants,
    totalParticipations,
    totalActivities,
    participationRate,
    qatariParticipants,
    nonQatariParticipants,
    unknownNationalityParticipants,
  };
}

export interface DetailedDashboardData {
  metrics: DashboardMetrics;
  qatariPopulation: number;
  nonQatariPopulation: number;
  completedActivities: number;
  draftActivities: number;
  averageParticipationsPerStudent: string;
  nonParticipationPercentage: number;
  inactiveSectionsCount: number;
  totalSectionsCount: number;
  activeCategoriesCount: number;
  totalCategoriesCount: number;
  gradeBreakdown: Array<{
    gradeId: string;
    gradeName: string;
    totalStudents: number;
    participantsCount: number;
    participationRate: number;
  }>;
  categoryDistribution: Array<{
    categoryId: string;
    name: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  prioritySections: Array<{
    classGroupId: string;
    gradeName: string;
    sectionName: string;
    totalStudents: number;
    participantsCount: number;
    participationRate: number;
  }>;
  recentActivities: Array<{
    id: string;
    name: string;
    activity_date: Date;
    categoryName: string;
    totalParticipants: number;
    status: string;
  }>;
  schoolName: string;
  allGrades: Array<{ id: string; name_ar: string }>;
  allSections: Array<{ id: string; name: string }>;
  allCategories: Array<{ id: string; name_ar: string }>;
  activeYearName: string;
}

export async function getDetailedDashboardData(
  options: StatisticsFilterOptions = {}
): Promise<DetailedDashboardData> {
  let academicYearId = options.academicYearId;
  let activeYearName = "";
  let currentAcademicYear: { id: string; name: string; start_date: Date; end_date: Date } | null = null;
  if (!academicYearId) {
    const currentYear = await prisma.academicYear.findFirst({ where: { is_current: true } });
    academicYearId = currentYear?.id;
    activeYearName = currentYear?.name || "";
    currentAcademicYear = currentYear;
  } else {
    currentAcademicYear = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
    activeYearName = currentAcademicYear?.name || "";
  }

  // 1. Base Dashboard Metrics
  const metrics = await getDashboardMetrics(options);

  // 2. Fetch School Name
  const settings = await getSchoolSettings();
  const schoolName = settings?.school_name_ar || "مدرسة عبد الله بن على المسند الثانوية للبنين";

  // 3. Population Nationality Breakdown
  const enrollmentWhere: Prisma.StudentEnrollmentWhereInput = {
    status: "ACTIVE",
    ...(academicYearId ? { academic_year_id: academicYearId } : {}),
  };
  if (options.gradeLevelId || options.sectionId) {
    enrollmentWhere.class_group = {
      ...(options.gradeLevelId ? { grade_level_id: options.gradeLevelId } : {}),
      ...(options.sectionId ? { section_id: options.sectionId } : {}),
    };
  }

  const enrolledStudents = await prisma.studentEnrollment.findMany({
    where: enrollmentWhere,
    select: {
      student: { select: { nationality_group: true } },
    },
  });

  const qatariPopulation = enrolledStudents.filter((e) => e.student.nationality_group === "QATARI").length;
  const nonQatariPopulation = enrolledStudents.filter((e) => e.student.nationality_group === "NON_QATARI").length;

  // 4. Completed vs Draft Activities
  const activityWhere: Prisma.ActivityWhereInput = {
    archived_at: null,
    ...(academicYearId ? { academic_year_id: academicYearId } : {}),
    ...(options.categoryId ? { category_id: options.categoryId } : {}),
  };
  const dateRange = resolveDateRange(options, currentAcademicYear);
  if (dateRange) {
    activityWhere.activity_date = dateRange;
  }

  const [completedActivities, draftActivities] = await Promise.all([
    prisma.activity.count({ where: { ...activityWhere, status: "COMPLETED" } }),
    prisma.activity.count({ where: { ...activityWhere, status: { not: "COMPLETED" } } }),
  ]);

  // 5. Average Participations per active student
  const averageParticipationsPerStudent =
    metrics.uniqueParticipants > 0
      ? (metrics.totalParticipations / metrics.uniqueParticipants).toFixed(1)
      : "0.0";

  // 6. Non-participation percentage
  const nonParticipationPercentage =
    metrics.totalPopulation > 0
      ? Number(((metrics.nonParticipants / metrics.totalPopulation) * 100).toFixed(1))
      : 0;

  // 7. Active Categories & Total Categories
  const totalCategoriesCount = await prisma.activityCategory.count({ where: { is_active: true } });
  const activitiesInScope = await prisma.activity.findMany({
    where: activityWhere,
    select: { category_id: true },
  });
  const activeCategoryIds = new Set(activitiesInScope.map((a) => a.category_id));
  const activeCategoriesCount = activeCategoryIds.size;

  // 8. Class Groups (Sections) Breakdown & Inactive Sections
  const classGroups = await prisma.classGroup.findMany({
    where: academicYearId ? { academic_year_id: academicYearId } : {},
    include: {
      grade_level: true,
      section: true,
      enrollments: {
        where: { status: "ACTIVE" },
        include: {
          participations: {
            where: {
              activity: activityWhere,
            },
          },
        },
      },
    },
    orderBy: [
      { grade_level: { sort_order: "asc" } },
      { section: { sort_order: "asc" } },
    ],
  });

  const totalSectionsCount = classGroups.length;
  let inactiveSectionsCount = 0;
  const sectionMetrics: Array<{
    classGroupId: string;
    gradeName: string;
    sectionName: string;
    totalStudents: number;
    participantsCount: number;
    participationRate: number;
  }> = [];

  for (const cg of classGroups) {
    const totalStudents = cg.enrollments.length;
    const participantsCount = cg.enrollments.filter((e) => e.participations.length > 0).length;
    const rate = totalStudents > 0 ? Number(((participantsCount / totalStudents) * 100).toFixed(1)) : 0;

    if (participantsCount === 0) {
      inactiveSectionsCount++;
    }

    sectionMetrics.push({
      classGroupId: cg.id,
      gradeName: cg.grade_level.name_ar,
      sectionName: cg.section.name,
      totalStudents,
      participantsCount,
      participationRate: rate,
    });
  }

  // Priority sections: sorted lowest rate first, then highest student count
  const prioritySections = [...sectionMetrics]
    .sort((a, b) => a.participationRate - b.participationRate || b.totalStudents - a.totalStudents)
    .slice(0, 5);

  // 9. Grade Levels Breakdown
  const gradeLevels = await prisma.gradeLevel.findMany({
    where: { is_active: true },
    orderBy: { sort_order: "asc" },
  });

  const gradeBreakdown = gradeLevels.map((gl) => {
    const matchingSections = sectionMetrics.filter((s) => s.gradeName === gl.name_ar);
    const totalStudents = matchingSections.reduce((acc, s) => acc + s.totalStudents, 0);
    const participantsCount = matchingSections.reduce((acc, s) => acc + s.participantsCount, 0);
    const rate = totalStudents > 0 ? Number(((participantsCount / totalStudents) * 100).toFixed(1)) : 0;

    return {
      gradeId: gl.id,
      gradeName: gl.name_ar,
      totalStudents,
      participantsCount,
      participationRate: rate,
    };
  });

  // 10. Category Distribution
  const categories = await prisma.activityCategory.findMany({
    where: { is_active: true },
    orderBy: { sort_order: "asc" },
  });

  const categoryColorPalette = [
    "#8A1538", // Qatar Maroon
    "#0d9488", // Teal
    "#2563eb", // Blue
    "#f59e0b", // Amber
    "#7c3aed", // Violet
    "#ec4899", // Pink
    "#10b981", // Emerald
    "#64748b", // Slate
    "#ea580c", // Orange
  ];

  const categoryDistribution = categories.map((cat, idx) => {
    const count = activitiesInScope.filter((a) => a.category_id === cat.id).length;
    const percentage =
      activitiesInScope.length > 0
        ? Number(((count / activitiesInScope.length) * 100).toFixed(1))
        : 0;

    return {
      categoryId: cat.id,
      name: cat.name_ar,
      count,
      percentage,
      color: categoryColorPalette[idx % categoryColorPalette.length],
    };
  }).filter((c) => c.count > 0);

  // 11. Recent Activities
  const recentActivitiesRaw = await prisma.activity.findMany({
    where: activityWhere,
    orderBy: { activity_date: "desc" },
    take: 6,
    include: {
      category: true,
      participations: { select: { id: true } },
    },
  });

  const recentActivities = recentActivitiesRaw.map((act) => ({
    id: act.id,
    name: act.name,
    activity_date: act.activity_date,
    categoryName: act.category.name_ar,
    totalParticipants: act.participations.length,
    status: act.status,
  }));

  // 12. Dropdown Filter Options
  const allSections = await prisma.section.findMany({
    orderBy: { sort_order: "asc" },
    select: { id: true, name: true },
  });

  return {
    metrics,
    qatariPopulation,
    nonQatariPopulation,
    completedActivities,
    draftActivities,
    averageParticipationsPerStudent,
    nonParticipationPercentage,
    inactiveSectionsCount,
    totalSectionsCount,
    activeCategoriesCount,
    totalCategoriesCount,
    gradeBreakdown,
    categoryDistribution,
    prioritySections,
    recentActivities,
    schoolName,
    allGrades: gradeLevels.map((g) => ({ id: g.id, name_ar: g.name_ar })),
    allSections,
    allCategories: categories.map((c) => ({ id: c.id, name_ar: c.name_ar })),
    activeYearName,
  };
}
