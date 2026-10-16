import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { canViewAllActivities } from "@/lib/auth/activity-scope";
import { getActivitiesForAssignment } from "@/lib/services/activity-service";
import { getAcademicYears, getCurrentAcademicYear } from "@/lib/services/academic-year-service";
import { prisma } from "@/lib/db/prisma";
import { ActivityAssignClient } from "@/components/activities/ActivityAssignClient";

interface AssignPageProps {
  searchParams: Promise<{ yearId?: string }>;
}

export default async function ActivityAssignPage({ searchParams }: AssignPageProps) {
  const session = await getSession();
  if (!canViewAllActivities(session?.user)) notFound();

  const params = await searchParams;
  const [currentYear, academicYears] = await Promise.all([getCurrentAcademicYear(), getAcademicYears()]);
  const yearId = params.yearId || currentYear?.id || "";

  const [activities, users] = await Promise.all([
    getActivitiesForAssignment(yearId || undefined),
    prisma.user.findMany({
      where: { is_active: true },
      orderBy: { display_name: "asc" },
      select: { id: true, display_name: true, username: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link href="/activities" className="hover:text-slate-800 flex items-center gap-1">
          <ArrowRight className="w-3.5 h-3.5" />
          <span>الأنشطة المدرسية</span>
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-bold">توزيع الأنشطة على المستخدمين</span>
      </div>

      <ActivityAssignClient
        activities={activities.map((a) => ({
          id: a.id,
          name: a.name,
          activity_date: a.activity_date.toISOString().split("T")[0],
          owner_id: a.created_by_id,
          category: a.category,
          participants: a._count.participations,
        }))}
        users={users}
        academicYears={academicYears.map((y) => ({ id: y.id, name: y.name }))}
        selectedYearId={yearId}
      />
    </div>
  );
}
