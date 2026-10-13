import { prisma } from "../db/prisma";
import { logAudit } from "../audit/audit-service";
import { Prisma } from "@prisma/client";

export interface StudentFilterOptions {
  search?: string;
  academicYearId?: string;
  gradeLevelId?: string;
  sectionId?: string;
  nationalityGroup?: "QATARI" | "NON_QATARI" | "UNKNOWN";
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export async function getStudents(options: StudentFilterOptions = {}) {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 20));
  const skip = (page - 1) * pageSize;

  // Build where conditions
  const where: Prisma.StudentWhereInput = {};

  if (options.isActive !== undefined) {
    where.is_active = options.isActive;
  }

  if (options.nationalityGroup === "QATARI" || options.nationalityGroup === "NON_QATARI") {
    where.nationality_group = options.nationalityGroup;
  } else if (options.nationalityGroup === "UNKNOWN") {
    where.OR = [
      { nationality_group: null },
      { nationality_group: "" },
    ];
  }

  if (options.search && options.search.trim()) {
    const s = options.search.trim();
    where.OR = [
      { full_name_ar: { contains: s } },
      { full_name_en: { contains: s } },
      { academic_number: { contains: s } },
    ];
  }

  // Filter by enrollment (academic year, grade, section)
  if (options.academicYearId || options.gradeLevelId || options.sectionId) {
    where.enrollments = {
      some: {
        status: "ACTIVE",
        ...(options.academicYearId ? { academic_year_id: options.academicYearId } : {}),
        class_group: {
          ...(options.gradeLevelId ? { grade_level_id: options.gradeLevelId } : {}),
          ...(options.sectionId ? { section_id: options.sectionId } : {}),
        },
      },
    };
  }

  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { full_name_ar: "asc" },
      include: {
        enrollments: {
          where: options.academicYearId ? { academic_year_id: options.academicYearId } : undefined,
          orderBy: { enrolled_from: "desc" },
          take: 1,
          include: {
            academic_year: true,
            class_group: {
              include: {
                grade_level: true,
                section: true,
              },
            },
          },
        },
        participations: {
          where: {
            activity: {
              archived_at: null,
              ...(options.academicYearId ? { academic_year_id: options.academicYearId } : {}),
            },
          },
          orderBy: {
            created_at: "desc",
          },
          select: {
            id: true,
            notes: true,
            created_at: true,
            activity: {
              select: {
                id: true,
                name: true,
                activity_date: true,
                status: true,
                category: {
                  select: {
                    id: true,
                    code: true,
                    name_ar: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    students,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getStudentMetrics(options: Omit<StudentFilterOptions, "page" | "pageSize"> = {}) {
  // Base where clause without nationality filter to compute breakdown of current filtered cohort
  const where: Prisma.StudentWhereInput = {};

  if (options.isActive !== undefined) {
    where.is_active = options.isActive;
  }

  if (options.search && options.search.trim()) {
    const s = options.search.trim();
    where.OR = [
      { full_name_ar: { contains: s } },
      { academic_number: { contains: s } },
    ];
  }

  if (options.academicYearId || options.gradeLevelId || options.sectionId) {
    where.enrollments = {
      some: {
        status: "ACTIVE",
        ...(options.academicYearId ? { academic_year_id: options.academicYearId } : {}),
        class_group: {
          ...(options.gradeLevelId ? { grade_level_id: options.gradeLevelId } : {}),
          ...(options.sectionId ? { section_id: options.sectionId } : {}),
        },
      },
    };
  }

  const [total, qatari, nonQatari] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.count({
      where: {
        ...where,
        nationality_group: "QATARI",
      },
    }),
    prisma.student.count({
      where: {
        ...where,
        nationality_group: "NON_QATARI",
      },
    }),
  ]);

  const missingNationality = total - (qatari + nonQatari);

  return {
    total,
    qatari,
    nonQatari,
    missingNationality,
  };
}

export async function getStudentById(id: string) {
  return prisma.student.findUnique({
    where: { id },
    include: {
      enrollments: {
        orderBy: { enrolled_from: "desc" },
        include: {
          academic_year: true,
          class_group: {
            include: {
              grade_level: true,
              section: true,
            },
          },
        },
      },
      participations: {
        orderBy: { created_at: "desc" },
        include: {
          activity: {
            include: {
              category: true,
              academic_year: true,
            },
          },
        },
      },
    },
  });
}

export async function createStudent(
  data: {
    academic_number?: string | null;
    personal_number?: string | null;
    full_name_ar: string;
    full_name_en?: string | null;
    nationality?: string | null;
    nationality_group?: "QATARI" | "NON_QATARI" | null;
    notes?: string | null;
    grade_level_id?: string | null;
    section_id?: string | null;
    academic_year_id?: string | null;
  },
  actorUserId?: string
) {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create student
    const student = await tx.student.create({
      data: {
        academic_number: data.academic_number ? data.academic_number.trim() : null,
        personal_number: data.personal_number ? data.personal_number.trim() : null,
        full_name_ar: data.full_name_ar.trim(),
        full_name_en: data.full_name_en ? data.full_name_en.trim() : null,
        nationality: data.nationality ? data.nationality.trim() : null,
        nationality_group: data.nationality_group || null,
        notes: data.notes ? data.notes.trim() : null,
      },
    });

    // 2. If enrollment data provided, ensure or find class group and enroll
    if (data.academic_year_id && data.grade_level_id && data.section_id) {
      const grade = await tx.gradeLevel.findUnique({ where: { id: data.grade_level_id } });
      const section = await tx.section.findUnique({ where: { id: data.section_id } });

      let classGroup = await tx.classGroup.findUnique({
        where: {
          academic_year_id_grade_level_id_section_id: {
            academic_year_id: data.academic_year_id,
            grade_level_id: data.grade_level_id,
            section_id: data.section_id,
          },
        },
      });

      if (!classGroup) {
        classGroup = await tx.classGroup.create({
          data: {
            academic_year_id: data.academic_year_id,
            grade_level_id: data.grade_level_id,
            section_id: data.section_id,
            display_name: `${grade?.name_ar || "الصف"} / ${section?.name || "الشعبة"}`,
          },
        });
      }

      await tx.studentEnrollment.create({
        data: {
          student_id: student.id,
          class_group_id: classGroup.id,
          academic_year_id: data.academic_year_id,
          status: "ACTIVE",
          enrolled_from: new Date(),
        },
      });
    }

    return student;
  });

  await logAudit({
    actorUserId,
    action: "CREATE",
    entityType: "student",
    entityId: result.id,
    afterData: result,
  });

  return result;
}

export async function updateStudent(
  id: string,
  data: {
    academic_number?: string | null;
    personal_number?: string | null;
    full_name_ar?: string;
    full_name_en?: string | null;
    nationality?: string | null;
    nationality_group?: "QATARI" | "NON_QATARI" | null;
    notes?: string | null;
    is_active?: boolean;
  },
  actorUserId?: string
) {
  const current = await prisma.student.findUnique({ where: { id } });
  if (!current) throw new Error("الطالب غير موجود");

  const updated = await prisma.student.update({
    where: { id },
    data: {
      academic_number: data.academic_number !== undefined ? (data.academic_number ? data.academic_number.trim() : null) : current.academic_number,
      personal_number: data.personal_number !== undefined ? (data.personal_number ? data.personal_number.trim() : null) : current.personal_number,
      full_name_ar: data.full_name_ar !== undefined ? data.full_name_ar.trim() : current.full_name_ar,
      full_name_en: data.full_name_en !== undefined ? (data.full_name_en ? data.full_name_en.trim() : null) : current.full_name_en,
      nationality: data.nationality !== undefined ? (data.nationality ? data.nationality.trim() : null) : current.nationality,
      nationality_group: data.nationality_group !== undefined ? data.nationality_group : current.nationality_group,
      notes: data.notes !== undefined ? (data.notes ? data.notes.trim() : null) : current.notes,
      is_active: data.is_active !== undefined ? data.is_active : current.is_active,
    },
  });

  await logAudit({
    actorUserId,
    action: "UPDATE",
    entityType: "student",
    entityId: updated.id,
    beforeData: current,
    afterData: updated,
  });

  return updated;
}
