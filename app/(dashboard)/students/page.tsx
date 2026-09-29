import React from "react";
import { getStudents, getStudentMetrics } from "@/lib/services/student-service";
import { getCurrentAcademicYear } from "@/lib/services/academic-year-service";
import { getSchoolSettings } from "@/lib/services/school-settings-service";
import { prisma } from "@/lib/db/prisma";
import { StudentsRegistryView } from "@/components/students/StudentsRegistryView";

interface StudentsPageProps {
  searchParams: Promise<{
    search?: string;
    gradeId?: string;
    sectionId?: string;
    nationality?: "QATARI" | "NON_QATARI" | "UNKNOWN";
    page?: string;
  }>;
}

export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const params = await searchParams;
  const currentYear = await getCurrentAcademicYear();
  const schoolSettings = await getSchoolSettings();
  const page = parseInt(params.page || "1", 10) || 1;

  const [studentsResult, metrics, gradeLevels, sections] = await Promise.all([
    getStudents({
      search: params.search,
      academicYearId: currentYear?.id,
      gradeLevelId: params.gradeId,
      sectionId: params.sectionId,
      nationalityGroup: params.nationality,
      page,
      pageSize: 20,
    }),
    getStudentMetrics({
      search: params.search,
      academicYearId: currentYear?.id,
      gradeLevelId: params.gradeId,
      sectionId: params.sectionId,
    }),
    prisma.gradeLevel.findMany({ orderBy: { sort_order: "asc" } }),
    prisma.section.findMany({ orderBy: { sort_order: "asc" } }),
  ]);

  const schoolName = schoolSettings?.school_name_ar || "مدرسة عبد الله بن علي المسند الثانوية للبنين";
  const academicYearName = currentYear?.name || "2026-2027";

  return (
    <StudentsRegistryView
      students={studentsResult.students}
      total={studentsResult.total}
      page={studentsResult.page}
      pageSize={studentsResult.pageSize}
      totalPages={studentsResult.totalPages}
      metrics={metrics}
      gradeLevels={gradeLevels}
      sections={sections}
      schoolName={schoolName}
      academicYearName={academicYearName}
      initialFilters={{
        search: params.search,
        gradeId: params.gradeId,
        sectionId: params.sectionId,
        nationality: params.nationality || "",
      }}
    />
  );
}
