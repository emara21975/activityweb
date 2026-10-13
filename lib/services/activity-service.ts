import { prisma } from "../db/prisma";
import { logAudit } from "../audit/audit-service";
import { Prisma } from "@prisma/client";

export interface ActivityFilterOptions {
  academicYearId?: string;
  categoryId?: string;
  status?: string;
  search?: string;
  from?: string;
  to?: string;
}

export async function getActivities(options: ActivityFilterOptions = {}) {
  const where: Prisma.ActivityWhereInput = {
    archived_at: null,
  };

  if (options.academicYearId) {
    where.academic_year_id = options.academicYearId;
  }

  if (options.categoryId) {
    where.category_id = options.categoryId;
  }

  if (options.status) {
    where.status = options.status;
  }

  if (options.search && options.search.trim()) {
    where.name = { contains: options.search.trim() };
  }

  if (options.from || options.to) {
    where.activity_date = {};
    if (options.from) {
      where.activity_date.gte = new Date(options.from);
    }
    if (options.to) {
      where.activity_date.lte = new Date(options.to);
    }
  }

  const activities = await prisma.activity.findMany({
    where,
    orderBy: { activity_date: "desc" },
    include: {
      category: true,
      academic_year: true,
      _count: {
        select: {
          attachments: {
            where: { archived_at: null },
          },
        },
      },
      participations: {
        include: {
          student: {
            select: {
              id: true,
              full_name_ar: true,
              full_name_en: true,
              academic_number: true,
              nationality_group: true,
              nationality: true,
            },
          },
          enrollment: {
            include: {
              class_group: {
                include: {
                  grade_level: true,
                  section: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return activities.map((act) => {
    const totalParticipants = act.participations.length;
    const qatariCount = act.participations.filter((p) => p.student.nationality_group === "QATARI").length;
    const nonQatariCount = act.participations.filter((p) => p.student.nationality_group === "NON_QATARI").length;

    return {
      id: act.id,
      name: act.name,
      activity_date: act.activity_date,
      status: act.status,
      notes: act.notes,
      category: act.category,
      academic_year: act.academic_year,
      attachmentsCount: act._count?.attachments || 0,
      totalParticipants,
      qatariCount,
      nonQatariCount,
      participations: act.participations.map((p) => ({
        id: p.id,
        studentId: p.student.id,
        studentName: p.student.full_name_ar,
        academicNumber: p.student.academic_number,
        nationalityGroup: p.student.nationality_group,
        nationality: p.student.nationality,
        gradeName: p.enrollment?.class_group?.grade_level?.name_ar || "—",
        sectionName: p.enrollment?.class_group?.section?.name || "—",
        notes: p.notes,
      })),
    };
  });
}

export async function getActivityById(id: string) {
  const act = await prisma.activity.findUnique({
    where: { id },
    include: {
      category: true,
      academic_year: true,
      creator: { select: { display_name: true, username: true } },
      participations: {
        include: {
          student: true,
          enrollment: {
            include: {
              class_group: {
                include: {
                  grade_level: true,
                  section: true,
                },
              },
            },
          },
        },
        orderBy: { student: { full_name_ar: "asc" } },
      },
      attachments: {
        where: { archived_at: null },
      },
    },
  });

  if (!act) return null;

  const totalParticipants = act.participations.length;
  const qatariCount = act.participations.filter((p) => p.student.nationality_group === "QATARI").length;
  const nonQatariCount = act.participations.filter((p) => p.student.nationality_group === "NON_QATARI").length;

  return {
    ...act,
    totalParticipants,
    qatariCount,
    nonQatariCount,
  };
}

export async function createActivity(
  data: {
    name: string;
    category_id: string;
    academic_year_id: string;
    activity_date: string;
    status?: string;
    notes?: string | null;
  },
  actorUserId?: string
) {
  const result = await prisma.activity.create({
    data: {
      name: data.name.trim(),
      category_id: data.category_id,
      academic_year_id: data.academic_year_id,
      activity_date: new Date(data.activity_date),
      status: data.status || "COMPLETED",
      notes: data.notes ? data.notes.trim() : null,
      created_by_id: actorUserId || null,
      updated_by_id: actorUserId || null,
    },
  });

  await logAudit({
    actorUserId,
    action: "CREATE",
    entityType: "activity",
    entityId: result.id,
    afterData: result,
  });

  return result;
}

export async function updateActivity(
  id: string,
  data: {
    name?: string;
    category_id?: string;
    academic_year_id?: string;
    activity_date?: string | Date;
    status?: string;
    notes?: string | null;
  },
  actorUserId?: string
) {
  const current = await prisma.activity.findUnique({ where: { id } });
  if (!current) throw new Error("النشاط غير موجود");

  const updated = await prisma.activity.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name.trim() : current.name,
      category_id: data.category_id !== undefined ? data.category_id : current.category_id,
      academic_year_id: data.academic_year_id !== undefined ? data.academic_year_id : current.academic_year_id,
      activity_date: data.activity_date !== undefined ? new Date(data.activity_date) : current.activity_date,
      status: data.status !== undefined ? data.status : current.status,
      notes: data.notes !== undefined ? (data.notes ? data.notes.trim() : null) : current.notes,
      updated_by_id: actorUserId || null,
    },
  });

  await logAudit({
    actorUserId,
    action: "UPDATE",
    entityType: "activity",
    entityId: updated.id,
    beforeData: current,
    afterData: updated,
  });

  return updated;
}

export async function archiveActivity(id: string, actorUserId?: string) {
  const current = await prisma.activity.findUnique({ where: { id } });
  if (!current) throw new Error("النشاط غير موجود");

  const updated = await prisma.activity.update({
    where: { id },
    data: {
      archived_at: new Date(),
      updated_by_id: actorUserId || null,
    },
  });

  await logAudit({
    actorUserId,
    action: "ARCHIVE",
    entityType: "activity",
    entityId: updated.id,
    beforeData: current,
    afterData: updated,
  });

  return updated;
}
