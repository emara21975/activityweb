import { prisma } from "../db/prisma";
import { logAudit } from "../audit/audit-service";

export interface RegisterGroupParticipationsInput {
  activityId: string;
  studentIds: string[];
  notes?: string | null;
  actorUserId?: string;
}

export async function registerGroupParticipations(input: RegisterGroupParticipationsInput) {
  const { activityId, studentIds, notes, actorUserId } = input;

  if (!studentIds || studentIds.length === 0) {
    throw new Error("لم يتم تحديد أي طالب للتسجيل.");
  }

  // 1. Fetch activity and verify existence
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    include: { academic_year: true },
  });

  if (!activity) {
    throw new Error("النشاط غير موجود.");
  }

  // 2. Perform atomic transaction
  const result = await prisma.$transaction(async (tx) => {
    // Check existing participations for this activity to prevent duplicates or race conditions
    const existing = await tx.participation.findMany({
      where: {
        activity_id: activityId,
        student_id: { in: studentIds },
      },
      select: { student_id: true },
    });

    const alreadyRegisteredIds = new Set(existing.map((p) => p.student_id));
    const newStudentIds = studentIds.filter((id) => !alreadyRegisteredIds.has(id));

    if (newStudentIds.length === 0) {
      return {
        addedCount: 0,
        alreadyRegisteredCount: alreadyRegisteredIds.size,
        message: "جميع الطلاب المحددين مسجلون بالفعل في هذا النشاط مسبقاً.",
      };
    }

    // Find active enrollments for these students in the activity's academic year
    const enrollments = await tx.studentEnrollment.findMany({
      where: {
        student_id: { in: newStudentIds },
        academic_year_id: activity.academic_year_id,
        status: "ACTIVE",
      },
      orderBy: { enrolled_from: "desc" },
    });

    // Map each student to their latest active enrollment
    const studentEnrollmentMap = new Map<string, string>();
    for (const enr of enrollments) {
      if (!studentEnrollmentMap.has(enr.student_id)) {
        studentEnrollmentMap.set(enr.student_id, enr.id);
      }
    }

    const participationsToCreate = [];
    const missingEnrollmentStudentIds = [];

    for (const studentId of newStudentIds) {
      const enrollmentId = studentEnrollmentMap.get(studentId);
      if (!enrollmentId) {
        missingEnrollmentStudentIds.push(studentId);
        continue;
      }
      participationsToCreate.push({
        activity_id: activityId,
        student_id: studentId,
        student_enrollment_id: enrollmentId,
        notes: notes ? notes.trim() : null,
        created_by_id: actorUserId || null,
      });
    }

    if (participationsToCreate.length === 0) {
      throw new Error("تعذر التسجيل: الطلاب المحددون ليس لديهم قيد دراسي نشط في نفس العام الدراسي للنشاط.");
    }

    // Insert atomic
    await tx.participation.createMany({
      data: participationsToCreate,
      skipDuplicates: true,
    });

    return {
      addedCount: participationsToCreate.length,
      alreadyRegisteredCount: alreadyRegisteredIds.size,
      missingEnrollmentCount: missingEnrollmentStudentIds.length,
      message: `تم تسجيل ${participationsToCreate.length} طالب بنجاح.${
        alreadyRegisteredIds.size > 0
          ? ` (${alreadyRegisteredIds.size} طالب مسجل مسبقاً)`
          : ""
      }`,
    };
  });

  await logAudit({
    actorUserId,
    action: "REGISTER_PARTICIPATIONS",
    entityType: "activity",
    entityId: activityId,
    afterData: {
      addedCount: result.addedCount,
      requestedStudentCount: studentIds.length,
    },
  });

  return result;
}

export async function removeParticipation(participationId: string, actorUserId?: string) {
  const current = await prisma.participation.findUnique({
    where: { id: participationId },
    include: {
      student: { select: { full_name_ar: true } },
      activity: { select: { name: true } },
    },
  });

  if (!current) {
    throw new Error("سجل المشاركة غير موجود.");
  }

  await prisma.participation.delete({
    where: { id: participationId },
  });

  await logAudit({
    actorUserId,
    action: "DELETE",
    entityType: "participation",
    entityId: participationId,
    beforeData: {
      student_id: current.student_id,
      activity_id: current.activity_id,
      student_name: current.student.full_name_ar,
      activity_name: current.activity.name,
    },
  });

  return { success: true };
}
