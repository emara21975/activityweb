import fs from "fs/promises";
import path from "path";
import { prisma } from "../db/prisma";
import { logAudit } from "../audit/audit-service";
import { createSystemBackup } from "./backup-service";

const ATTACHMENTS_DIR = path.join(process.cwd(), "storage", "attachments");

export interface CleanupStats {
  participationsCount: number;
  activitiesCount: number;
  attachmentsCount: number;
  studentsCount: number;
  enrollmentsCount: number;
  importBatchesCount: number;
  auditLogsCount: number;
  academicYears: Array<{
    id: string;
    name: string;
    is_current: boolean;
    activitiesCount: number;
    participationsCount: number;
  }>;
}

export async function getCleanupStats(): Promise<CleanupStats> {
  const [
    participationsCount,
    activitiesCount,
    attachmentsCount,
    studentsCount,
    enrollmentsCount,
    importBatchesCount,
    auditLogsCount,
    academicYears,
  ] = await Promise.all([
    prisma.participation.count(),
    prisma.activity.count({ where: { archived_at: null } }),
    prisma.activityAttachment.count({ where: { archived_at: null } }),
    prisma.student.count({ where: { archived_at: null } }),
    prisma.studentEnrollment.count(),
    prisma.importBatch.count(),
    prisma.auditLog.count(),
    prisma.academicYear.findMany({
      orderBy: { start_date: "desc" },
      include: {
        _count: {
          select: {
            activities: true,
          },
        },
        activities: {
          select: {
            _count: {
              select: {
                participations: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const yearStats = academicYears.map((y) => {
    const totalPart = y.activities.reduce((acc, act) => acc + act._count.participations, 0);
    return {
      id: y.id,
      name: y.name,
      is_current: y.is_current,
      activitiesCount: y._count.activities,
      participationsCount: totalPart,
    };
  });

  return {
    participationsCount,
    activitiesCount,
    attachmentsCount,
    studentsCount,
    enrollmentsCount,
    importBatchesCount,
    auditLogsCount,
    academicYears: yearStats,
  };
}

export interface PurgeOptions {
  type: "participations" | "activities" | "students" | "imports" | "audit_logs" | "factory_reset";
  academicYearId?: string;
  daysOlderThan?: number;
  confirmationText?: string;
  actorUserId?: string;
}

export interface PurgeResult {
  success: boolean;
  message: string;
  details: Record<string, number>;
  safetyBackupKey?: string;
}

export async function executeDataPurge(options: PurgeOptions): Promise<PurgeResult> {
  const { type, academicYearId, daysOlderThan, confirmationText, actorUserId } = options;

  // 1. Mandatory safety backup snapshot before any destructive purge
  let safetyBackupKey: string | undefined;
  try {
    const backup = await createSystemBackup(actorUserId, true);
    safetyBackupKey = backup.storageKey;
  } catch (err) {
    console.error("Failed to create pre-purge safety backup:", err);
    // Even if backup fails, let's report error to prevent data loss
    throw new Error("تعذر إنشاء نقطة أمان احتياطية قبل التفريغ. تم إلغاء العملية لحماية البيانات.");
  }

  // 2. Perform requested purge action
  switch (type) {
    case "participations": {
      let deletedCount = 0;
      if (academicYearId) {
        // Delete participations where activity belongs to this year
        const res = await prisma.participation.deleteMany({
          where: {
            activity: {
              academic_year_id: academicYearId,
            },
          },
        });
        deletedCount = res.count;
      } else {
        const res = await prisma.participation.deleteMany({});
        deletedCount = res.count;
      }

      await logAudit({
        actorUserId,
        action: "PURGE_PARTICIPATIONS",
        entityType: "participation",
        entityId: academicYearId || "ALL",
        beforeData: { deletedCount, academicYearId },
      });

      return {
        success: true,
        message: `تم تفريغ ${deletedCount} مشاركة بنجاح وحفظ نقطة أمان احتياطية.`,
        details: { participations: deletedCount },
        safetyBackupKey,
      };
    }

    case "activities": {
      // Find activities to delete
      const whereCondition = academicYearId
        ? { academic_year_id: academicYearId }
        : {};

      const activities = await prisma.activity.findMany({
        where: whereCondition,
        select: { id: true },
      });
      const activityIds = activities.map((a) => a.id);

      if (activityIds.length === 0) {
        return {
          success: true,
          message: "لا توجد أنشطة مطابقة لحذفها.",
          details: { activities: 0, participations: 0, attachments: 0 },
          safetyBackupKey,
        };
      }

      // Step A: Delete participations for these activities
      const partRes = await prisma.participation.deleteMany({
        where: { activity_id: { in: activityIds } },
      });

      // Step B: Find attachments and remove files from disk
      const attachments = await prisma.activityAttachment.findMany({
        where: { activity_id: { in: activityIds } },
      });

      for (const att of attachments) {
        try {
          const safeName = path.basename(att.storage_key);
          await fs.unlink(path.join(ATTACHMENTS_DIR, safeName));
        } catch {
          // File may not exist on disk, ignore
        }
      }

      // Step C: Delete attachments from database
      const attRes = await prisma.activityAttachment.deleteMany({
        where: { activity_id: { in: activityIds } },
      });

      // Step D: Delete activities
      const actRes = await prisma.activity.deleteMany({
        where: { id: { in: activityIds } },
      });

      await logAudit({
        actorUserId,
        action: "PURGE_ACTIVITIES",
        entityType: "activity",
        entityId: academicYearId || "ALL",
        beforeData: {
          activitiesCount: actRes.count,
          participationsCount: partRes.count,
          attachmentsCount: attRes.count,
          academicYearId,
        },
      });

      return {
        success: true,
        message: `تم حذف ${actRes.count} نشاط، ${partRes.count} مشاركة، و ${attRes.count} مرفق بنجاح.`,
        details: {
          activities: actRes.count,
          participations: partRes.count,
          attachments: attRes.count,
        },
        safetyBackupKey,
      };
    }

    case "students": {
      if (confirmationText !== "تفريغ الطلاب") {
        throw new Error("يرجى كتابة نص التأكيد بدقة (تفريغ الطلاب) لإتمام الحذف.");
      }

      // Step A: Delete all participations first
      const partRes = await prisma.participation.deleteMany({});

      // Step B: Delete all enrollments
      const enrollRes = await prisma.studentEnrollment.deleteMany({});

      // Step C: Delete all students
      const stuRes = await prisma.student.deleteMany({});

      await logAudit({
        actorUserId,
        action: "PURGE_STUDENTS",
        entityType: "student",
        entityId: "ALL",
        beforeData: {
          studentsCount: stuRes.count,
          enrollmentsCount: enrollRes.count,
          participationsCount: partRes.count,
        },
      });

      return {
        success: true,
        message: `تم تفريغ ${stuRes.count} طالب، ${enrollRes.count} قيد دراسي، و ${partRes.count} مشاركة بنجاح.`,
        details: {
          students: stuRes.count,
          enrollments: enrollRes.count,
          participations: partRes.count,
        },
        safetyBackupKey,
      };
    }

    case "imports": {
      const errRes = await prisma.importError.deleteMany({});
      const batchRes = await prisma.importBatch.deleteMany({});

      await logAudit({
        actorUserId,
        action: "PURGE_IMPORTS",
        entityType: "import_batch",
        entityId: "ALL",
        beforeData: { batchesCount: batchRes.count, errorsCount: errRes.count },
      });

      return {
        success: true,
        message: `تم تفريغ ${batchRes.count} دفعة استيراد و ${errRes.count} سجل أخطاء بنجاح.`,
        details: {
          importBatches: batchRes.count,
          importErrors: errRes.count,
        },
        safetyBackupKey,
      };
    }

    case "audit_logs": {
      let whereClause = {};
      if (daysOlderThan && daysOlderThan > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOlderThan);
        whereClause = {
          occurred_at: {
            lt: cutoffDate,
          },
        };
      }

      const res = await prisma.auditLog.deleteMany({
        where: whereClause,
      });

      await logAudit({
        actorUserId,
        action: "PURGE_AUDIT_LOGS",
        entityType: "audit_log",
        entityId: daysOlderThan ? `OLDER_THAN_${daysOlderThan}_DAYS` : "ALL",
        beforeData: { deletedLogsCount: res.count, daysOlderThan },
      });

      return {
        success: true,
        message: `تم تفريغ ${res.count} سجل عمليات بنجاح.`,
        details: { auditLogs: res.count },
        safetyBackupKey,
      };
    }

    case "factory_reset": {
      if (confirmationText !== "تفريغ شامل للمصنع") {
        throw new Error("يرجى كتابة نص التأكيد بدقة (تفريغ شامل للمصنع) لتنفيذ هذا الإجراء الحرج.");
      }

      // Order of deletion respecting foreign keys:
      // 1. Participations
      const partRes = await prisma.participation.deleteMany({});

      // 2. Attachments (files from disk + DB)
      const allAttachments = await prisma.activityAttachment.findMany({});
      for (const att of allAttachments) {
        try {
          const safeName = path.basename(att.storage_key);
          await fs.unlink(path.join(ATTACHMENTS_DIR, safeName));
        } catch {
          // ignore
        }
      }
      const attRes = await prisma.activityAttachment.deleteMany({});

      // 3. Activities
      const actRes = await prisma.activity.deleteMany({});

      // 4. Enrollments
      const enrollRes = await prisma.studentEnrollment.deleteMany({});

      // 5. Students
      const stuRes = await prisma.student.deleteMany({});

      // 6. Import Errors & Batches
      const errRes = await prisma.importError.deleteMany({});
      const batchRes = await prisma.importBatch.deleteMany({});

      // Note: We deliberately PRESERVE:
      // - SchoolSettings
      // - AcademicYears
      // - GradeLevels, Sections, ClassGroups
      // - ActivityCategories
      // - Users, Roles, Permissions, UserRoles, RolePermissions
      // - BackupMetadata

      await logAudit({
        actorUserId,
        action: "FACTORY_RESET",
        entityType: "system",
        entityId: "SYSTEM_WIDE",
        beforeData: {
          participations: partRes.count,
          activities: actRes.count,
          attachments: attRes.count,
          students: stuRes.count,
          enrollments: enrollRes.count,
          importBatches: batchRes.count,
          importErrors: errRes.count,
        },
      });

      return {
        success: true,
        message:
          "تم تفريغ وتصفير جميع السجلات والأنشطة والطلاب بنجاح مع الحفاظ على المستخدمين والإعدادات، وتوليد نقطة أمان احتياطية كاملة.",
        details: {
          participations: partRes.count,
          activities: actRes.count,
          attachments: attRes.count,
          students: stuRes.count,
          enrollments: enrollRes.count,
          importBatches: batchRes.count,
          importErrors: errRes.count,
        },
        safetyBackupKey,
      };
    }

    default:
      throw new Error("نوع التفريغ غير معروف أو غير معتمد.");
  }
}
