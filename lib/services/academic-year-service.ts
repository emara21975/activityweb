import { prisma } from "../db/prisma";
import { logAudit } from "../audit/audit-service";

export async function getAcademicYears() {
  return prisma.academicYear.findMany({
    orderBy: { start_date: "desc" },
    include: {
      _count: {
        select: {
          activities: true,
          enrollments: true,
        },
      },
    },
  });
}

export async function getCurrentAcademicYear() {
  return prisma.academicYear.findFirst({
    where: { is_current: true },
  });
}

export async function createAcademicYear(
  data: {
    name: string;
    start_date: string;
    end_date: string;
    is_current?: boolean;
  },
  actorUserId?: string
) {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);

  const result = await prisma.$transaction(async (tx) => {
    if (data.is_current) {
      await tx.academicYear.updateMany({
        where: { is_current: true },
        data: { is_current: false },
      });
    }

    const year = await tx.academicYear.create({
      data: {
        name: data.name,
        start_date: startDate,
        end_date: endDate,
        is_current: data.is_current ?? false,
      },
    });

    if (data.is_current) {
      const settings = await tx.schoolSettings.findFirst();
      if (settings) {
        await tx.schoolSettings.update({
          where: { id: settings.id },
          data: { current_academic_year_id: year.id },
        });
      }
    }

    return year;
  });

  await logAudit({
    actorUserId,
    action: "CREATE",
    entityType: "academic_year",
    entityId: result.id,
    afterData: result,
  });

  return result;
}

export async function setCurrentAcademicYear(yearId: string, actorUserId?: string) {
  const result = await prisma.$transaction(async (tx) => {
    // Unset current for all
    await tx.academicYear.updateMany({
      where: { is_current: true },
      data: { is_current: false },
    });

    // Set new current
    const updatedYear = await tx.academicYear.update({
      where: { id: yearId },
      data: { is_current: true },
    });

    // Update school settings current year FK
    const settings = await tx.schoolSettings.findFirst();
    if (settings) {
      await tx.schoolSettings.update({
        where: { id: settings.id },
        data: { current_academic_year_id: updatedYear.id },
      });
    }

    return updatedYear;
  });

  await logAudit({
    actorUserId,
    action: "SET_CURRENT",
    entityType: "academic_year",
    entityId: result.id,
    afterData: { is_current: true },
  });

  return result;
}

export async function updateAcademicYearTerms(
  yearId: string,
  data: {
    term1_start_date?: string | null;
    term1_end_date?: string | null;
    term2_start_date?: string | null;
    term2_end_date?: string | null;
  },
  actorUserId?: string
) {
  const updatePayload: any = {
    term1_start_date: data.term1_start_date ? new Date(data.term1_start_date) : null,
    term1_end_date: data.term1_end_date ? new Date(data.term1_end_date) : null,
    term2_start_date: data.term2_start_date ? new Date(data.term2_start_date) : null,
    term2_end_date: data.term2_end_date ? new Date(data.term2_end_date) : null,
  };

  const updated: any = await prisma.academicYear.update({
    where: { id: yearId },
    data: updatePayload,
  });

  await logAudit({
    actorUserId,
    action: "UPDATE",
    entityType: "academic_year_terms",
    entityId: updated.id,
    afterData: {
      term1_start: updated.term1_start_date,
      term1_end: updated.term1_end_date,
      term2_start: updated.term2_start_date,
      term2_end: updated.term2_end_date,
    },
  });

  return updated;
}
