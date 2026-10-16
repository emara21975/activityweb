import React from "react";
import { getDetailedDashboardData } from "@/lib/services/statistics-service";
import { currentActivityScope } from "@/lib/auth/activity-scope";
import { getCurrentAcademicYear } from "@/lib/services/academic-year-service";
import { DashboardView } from "@/components/dashboard/dashboard-view";

interface DashboardPageProps {
  searchParams: Promise<{
    yearId?: string;
    gradeId?: string;
    sectionId?: string;
    categoryId?: string;
    period?: string;
    from?: string;
    to?: string;
    date?: string;
    month?: string;
  }>;
}

export const metadata = {
  title: "لوحة المؤشرات العامة - نظام إدارة الأنشطة الطلابية",
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const currentYear = await getCurrentAcademicYear();
  const selectedYearId = params.yearId || currentYear?.id;

  const data = await getDetailedDashboardData({
    academicYearId: selectedYearId,
    gradeLevelId: params.gradeId,
    sectionId: params.sectionId,
    categoryId: params.categoryId,
    period: params.period,
    from: params.from,
    to: params.to,
    date: params.date,
    month: params.month,
    // Teachers see figures for their own activities only
    activityScope: await currentActivityScope(),
  });

  return <DashboardView data={data} />;
}
