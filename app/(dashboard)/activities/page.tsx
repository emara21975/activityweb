import React from "react";
import { getActivities } from "@/lib/services/activity-service";
import { getAcademicYears, getCurrentAcademicYear } from "@/lib/services/academic-year-service";
import { getCategories } from "@/lib/services/category-service";
import { getSchoolSettings } from "@/lib/services/school-settings-service";
import { getSession } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ActivitiesRegistryView } from "@/components/activities/ActivitiesRegistryView";

interface ActivitiesPageProps {
  searchParams: Promise<{
    yearId?: string;
    categoryId?: string;
    status?: string;
    search?: string;
  }>;
}

export default async function ActivitiesPage({ searchParams }: ActivitiesPageProps) {
  const params = await searchParams;
  const [currentYear, academicYears, schoolSettings, categories, session] = await Promise.all([
    getCurrentAcademicYear(),
    getAcademicYears(),
    getSchoolSettings(),
    getCategories(true),
    getSession(),
  ]);

  const isSuperAdmin = session?.user?.roles?.includes("SUPER_ADMIN") || false;
  const canManageCategories =
    isSuperAdmin ||
    (session?.user?.permissions?.includes(PERMISSIONS.CATEGORY_MANAGE) ?? false) ||
    (session?.user?.permissions?.includes(PERMISSIONS.ACTIVITY_CREATE) ?? false);

  const selectedYearId = params.yearId || currentYear?.id || "";

  const activities = await getActivities({
    academicYearId: selectedYearId || undefined,
    categoryId: params.categoryId,
    status: params.status,
    search: params.search,
  });

  const schoolName = schoolSettings?.school_name_ar || "مدرسة عبد الله بن علي المسند الثانوية للبنين";
  const academicYearName = academicYears.find((y) => y.id === selectedYearId)?.name || currentYear?.name || "2026-2027";

  return (
    <ActivitiesRegistryView
      activities={activities}
      academicYears={academicYears}
      categories={categories}
      selectedYearId={selectedYearId}
      schoolName={schoolName}
      academicYearName={academicYearName}
      canManageCategories={canManageCategories}
      initialFilters={{
        yearId: params.yearId,
        categoryId: params.categoryId,
        status: params.status,
        search: params.search,
      }}
    />
  );
}
