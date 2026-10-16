import React from "react";
import { getCurrentAcademicYear } from "@/lib/services/academic-year-service";
import { getActivities } from "@/lib/services/activity-service";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { activityScopeWhere } from "@/lib/auth/activity-scope";
import { ParticipationRegisterForm } from "@/components/participations/ParticipationRegisterForm";

interface ParticipationsPageProps {
  searchParams: Promise<{
    activityId?: string;
  }>;
}

export default async function ParticipationsPage({ searchParams }: ParticipationsPageProps) {
  const params = await searchParams;
  const [currentYear, session] = await Promise.all([getCurrentAcademicYear(), getSession()]);

  const [activities, enrollments, gradeLevels, sections] = await Promise.all([
    getActivities({
      academicYearId: currentYear?.id,
      scope: session?.user ? activityScopeWhere(session.user) : { id: "__none__" },
    }),
    prisma.studentEnrollment.findMany({
      where: {
        status: "ACTIVE",
        ...(currentYear?.id ? { academic_year_id: currentYear.id } : {}),
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
    }),
    prisma.gradeLevel.findMany({ orderBy: { sort_order: "asc" } }),
    prisma.section.findMany({ orderBy: { sort_order: "asc" } }),
  ]);

  const activityOptions = activities.map((a) => ({
    id: a.id,
    name: a.name,
    activity_date: new Date(a.activity_date).toISOString().split("T")[0],
    categoryName: a.category.name_ar,
  }));

  const studentOptions = enrollments.map((enr) => ({
    id: enr.student.id,
    full_name_ar: enr.student.full_name_ar,
    academic_number: enr.student.academic_number,
    nationality_group: enr.student.nationality_group,
    grade_level_id: enr.class_group.grade_level_id,
    section_id: enr.class_group.section_id,
    gradeName: enr.class_group.grade_level.name_ar,
    sectionName: enr.class_group.section.name,
  }));

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">
          تسجيل المشاركات الجماعية
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          تسجيل حضور ومشاركة طلاب الفصول والشعب في الأنشطة المدرسية المنفذة
        </p>
      </div>

      <ParticipationRegisterForm
        activities={activityOptions}
        students={studentOptions}
        gradeLevels={gradeLevels}
        sections={sections}
        initialActivityId={params.activityId}
      />
    </div>
  );
}
