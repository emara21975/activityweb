import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "../db/prisma";
import { logAudit } from "../audit/audit-service";

const BACKUPS_DIR = path.join(process.cwd(), "storage", "backups");
const ATTACHMENTS_DIR = path.join(process.cwd(), "storage", "attachments");
const CURRENT_DB_VERSION = "PostgreSQL 16 / Activity Web v2.0";

export interface BackupSummary {
  id: string;
  storage_key: string;
  created_at: Date;
  status: string;
  checksum: string | null;
  db_version: string | null;
  attachment_manifest_key: string | null;
  creator_name: string | null;
  file_size_bytes: number;
  file_exists: boolean;
}

/**
 * Custom JSON serializer handling BigInt values
 */
function serializeWithBigInt(data: unknown): string {
  return JSON.stringify(data, (_, value) =>
    typeof value === "bigint" ? value.toString() : value,
    2
  );
}

/**
 * Creates a complete database snapshot and attachment manifest
 */
export async function createSystemBackup(actorUserId?: string, isPreRestore = false) {
  await fs.mkdir(BACKUPS_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const prefix = isPreRestore ? "pre-restore-safety" : "backup";
  const storageKey = `${prefix}-${timestamp}.json`;
  const filePath = path.join(BACKUPS_DIR, storageKey);

  // 1. Gather all database records
  const [
    schoolSettings,
    academicYears,
    categories,
    gradeLevels,
    sections,
    classGroups,
    students,
    enrollments,
    activities,
    participations,
    attachments,
    roles,
    permissions,
    rolePermissions,
    users,
    userRoles,
    importBatches,
    importErrors,
    auditLogs,
  ] = await Promise.all([
    prisma.schoolSettings.findMany(),
    prisma.academicYear.findMany(),
    prisma.activityCategory.findMany(),
    prisma.gradeLevel.findMany(),
    prisma.section.findMany(),
    prisma.classGroup.findMany(),
    prisma.student.findMany(),
    prisma.studentEnrollment.findMany(),
    prisma.activity.findMany(),
    prisma.participation.findMany(),
    prisma.activityAttachment.findMany(),
    prisma.role.findMany(),
    prisma.permission.findMany(),
    prisma.rolePermission.findMany(),
    prisma.user.findMany(),
    prisma.userRole.findMany(),
    prisma.importBatch.findMany(),
    prisma.importError.findMany(),
    prisma.auditLog.findMany(),
  ]);

  // 2. Scan attachments folder for physical manifest
  const physicalAttachments: Array<{ filename: string; size: number; checksum: string }> = [];
  try {
    const files = await fs.readdir(ATTACHMENTS_DIR);
    for (const f of files) {
      const p = path.join(ATTACHMENTS_DIR, f);
      const stat = await fs.stat(p);
      if (stat.isFile()) {
        const buf = await fs.readFile(p);
        const fileChecksum = crypto.createHash("sha256").update(buf).digest("hex");
        physicalAttachments.push({
          filename: f,
          size: stat.size,
          checksum: fileChecksum,
        });
      }
    }
  } catch {
    // attachments dir may be empty
  }

  const payload = {
    version: CURRENT_DB_VERSION,
    created_at: new Date().toISOString(),
    is_pre_restore: isPreRestore,
    tables: {
      schoolSettings,
      academicYears,
      categories,
      gradeLevels,
      sections,
      classGroups,
      students,
      enrollments,
      activities,
      participations,
      attachments,
      roles,
      permissions,
      rolePermissions,
      users,
      userRoles,
      importBatches,
      importErrors,
      auditLogs,
    },
    attachment_manifest: physicalAttachments,
    counts: {
      students: students.length,
      activities: activities.length,
      participations: participations.length,
      users: users.length,
      attachments: attachments.length,
    },
  };

  const serialized = serializeWithBigInt(payload);
  const checksum = crypto.createHash("sha256").update(serialized).digest("hex");

  // Write backup file to disk
  await fs.writeFile(filePath, serialized, "utf-8");

  // Save metadata
  const record = await prisma.backupMetadata.create({
    data: {
      storage_key: storageKey,
      status: "SUCCESS",
      checksum,
      db_version: CURRENT_DB_VERSION,
      attachment_manifest_key: `${storageKey}-manifest`,
      created_by_id: actorUserId || null,
    },
  });

  await logAudit({
    actorUserId,
    action: isPreRestore ? "CREATE_SAFETY_BACKUP" : "CREATE_BACKUP",
    entityType: "backup_metadata",
    entityId: record.id,
    afterData: {
      storageKey,
      counts: payload.counts,
      checksum,
    },
  });

  return {
    record,
    counts: payload.counts,
    storageKey,
  };
}

/**
 * Imports an external backup JSON file to the server storage
 */
export async function importBackupFile(fileBuffer: Buffer, originalFileName: string, actorUserId?: string) {
  await fs.mkdir(BACKUPS_DIR, { recursive: true });

  const raw = fileBuffer.toString("utf-8");
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("ملف النسخة الاحتياطية غير صالح (تنسيق JSON معطوب).");
  }

  if (!parsed || !parsed.tables || typeof parsed.tables !== "object") {
    throw new Error("ملف النسخة الاحتياطية غير متوافق: لا يحتوي على بنية البيانات المطلوبة.");
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const cleanOriginalName = path.basename(originalFileName).replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageKey = cleanOriginalName.endsWith(".json")
    ? `imported-${timestamp}-${cleanOriginalName}`
    : `imported-${timestamp}-${cleanOriginalName}.json`;

  const filePath = path.join(BACKUPS_DIR, storageKey);
  const checksum = crypto.createHash("sha256").update(raw).digest("hex");

  await fs.writeFile(filePath, raw, "utf-8");

  const record = await prisma.backupMetadata.create({
    data: {
      storage_key: storageKey,
      status: "SUCCESS",
      checksum,
      db_version: parsed.version || CURRENT_DB_VERSION,
      attachment_manifest_key: `${storageKey}-manifest`,
      created_by_id: actorUserId || null,
    },
  });

  await logAudit({
    actorUserId,
    action: "IMPORT_BACKUP",
    entityType: "backup_metadata",
    entityId: record.id,
    afterData: {
      storageKey,
      counts: parsed.counts || {},
      checksum,
    },
  });

  return {
    record,
    storageKey,
  };
}

/**
 * Lists all backups with disk status
 */
export async function listSystemBackups(): Promise<BackupSummary[]> {
  await fs.mkdir(BACKUPS_DIR, { recursive: true });

  const records = await prisma.backupMetadata.findMany({
    orderBy: { created_at: "desc" },
    include: {
      creator: { select: { display_name: true, username: true } },
    },
  });

  const summaries: BackupSummary[] = [];

  for (const r of records) {
    const filePath = path.join(BACKUPS_DIR, path.basename(r.storage_key));
    let fileExists = false;
    let fileSize = 0;

    try {
      const stat = await fs.stat(filePath);
      fileExists = true;
      fileSize = stat.size;
    } catch {
      fileExists = false;
    }

    summaries.push({
      id: r.id,
      storage_key: r.storage_key,
      created_at: r.created_at,
      status: r.status,
      checksum: r.checksum,
      db_version: r.db_version,
      attachment_manifest_key: r.attachment_manifest_key,
      creator_name: r.creator ? r.creator.display_name : "النظام",
      file_size_bytes: fileSize,
      file_exists: fileExists,
    });
  }

  return summaries;
}

/**
 * Retrieves a backup file for download
 */
export async function getBackupFileForDownload(backupId: string) {
  const meta = await prisma.backupMetadata.findUnique({
    where: { id: backupId },
  });

  if (!meta) throw new Error("سجل النسخة الاحتياطية غير موجود.");

  const filePath = path.join(BACKUPS_DIR, path.basename(meta.storage_key));
  try {
    await fs.access(filePath);
  } catch {
    throw new Error("ملف النسخة الاحتياطية غير موجود على القرص.");
  }

  const content = await fs.readFile(filePath);
  return {
    meta,
    content,
    filename: path.basename(meta.storage_key),
  };
}

/**
 * Restores the system state from a backup file.
 * CRITICAL SAFETY REQUIREMENT: Always takes an automatic pre-restore safety snapshot first!
 */
export async function restoreSystemBackup(backupId: string, actorUserId?: string) {
  const meta = await prisma.backupMetadata.findUnique({
    where: { id: backupId },
  });

  if (!meta) throw new Error("سجل النسخة الاحتياطية غير موجود.");

  const filePath = path.join(BACKUPS_DIR, path.basename(meta.storage_key));
  try {
    await fs.access(filePath);
  } catch {
    throw new Error("ملف النسخة الاحتياطية غير موجود على القرص.");
  }

  const raw = await fs.readFile(filePath, "utf-8");

  // Verify SHA256 integrity
  const actualChecksum = crypto.createHash("sha256").update(raw).digest("hex");
  if (meta.checksum && meta.checksum !== actualChecksum) {
    throw new Error("فشل التحقق من سلامة النسخة الاحتياطية (تطابق البصمة الرقمية SHA256 غير سليم).");
  }

  interface BackupPayloadData {
    tables: {
      schoolSettings: any[];
      academicYears: any[];
      categories: any[];
      gradeLevels: any[];
      sections: any[];
      classGroups: any[];
      students: any[];
      enrollments: any[];
      activities: any[];
      participations: any[];
      attachments: any[];
      roles: any[];
      permissions: any[];
      rolePermissions: any[];
      users: any[];
      userRoles: any[];
      importBatches: any[];
      importErrors: any[];
      auditLogs: any[];
    };
  }

  const parsed = JSON.parse(raw) as BackupPayloadData;
  if (!parsed.tables) {
    throw new Error("بنية ملف النسخة الاحتياطية غير صالحة.");
  }

  // 1. Mandatory Pre-Restore Safety Snapshot
  const safetyBackup = await createSystemBackup(actorUserId, true);

  // 2. Perform restoration in atomic transaction
  await prisma.$transaction(async (tx) => {
    // Reverse dependency cleanup
    await tx.auditLog.deleteMany();
    await tx.importError.deleteMany();
    await tx.importBatch.deleteMany();
    await tx.participation.deleteMany();
    await tx.activityAttachment.deleteMany();
    await tx.activity.deleteMany();
    await tx.studentEnrollment.deleteMany();
    await tx.classGroup.deleteMany();
    await tx.student.deleteMany();
    await tx.section.deleteMany();
    await tx.gradeLevel.deleteMany();
    await tx.activityCategory.deleteMany();
    await tx.schoolSettings.deleteMany();
    await tx.academicYear.deleteMany();
    await tx.userRole.deleteMany();
    await tx.rolePermission.deleteMany();
    await tx.permission.deleteMany();
    await tx.role.deleteMany();
    await tx.user.deleteMany();

    const parseDateOrNull = (val: unknown): Date | null => {
      if (!val) return null;
      const d = new Date(val as string);
      return isNaN(d.getTime()) ? null : d;
    };

    const parseDateOrDefault = (val: unknown, fallback = new Date()): Date => {
      if (!val) return fallback;
      const d = new Date(val as string);
      return isNaN(d.getTime()) ? fallback : d;
    };

    const t = parsed.tables as Record<string, any[]>;

    // Forward dependency restoration
    if (t.roles?.length) {
      await tx.role.createMany({
        data: t.roles.map((r) => ({
          ...r,
          created_at: parseDateOrDefault(r.created_at),
        })),
      });
    }
    if (t.permissions?.length) {
      await tx.permission.createMany({ data: t.permissions });
    }
    if (t.rolePermissions?.length) {
      await tx.rolePermission.createMany({ data: t.rolePermissions });
    }
    if (t.users?.length) {
      await tx.user.createMany({
        data: t.users.map((u) => ({
          ...u,
          last_login_at: parseDateOrNull(u.last_login_at),
          password_changed_at: parseDateOrNull(u.password_changed_at),
          created_at: parseDateOrDefault(u.created_at),
          updated_at: parseDateOrDefault(u.updated_at),
        })),
      });
    }
    if (t.userRoles?.length) {
      await tx.userRole.createMany({ data: t.userRoles });
    }
    if (t.academicYears?.length) {
      await tx.academicYear.createMany({
        data: t.academicYears.map((y) => ({
          ...y,
          start_date: parseDateOrDefault(y.start_date),
          end_date: parseDateOrDefault(y.end_date),
          created_at: parseDateOrDefault(y.created_at),
          updated_at: parseDateOrDefault(y.updated_at),
        })),
      });
    }
    if (t.schoolSettings?.length) {
      await tx.schoolSettings.createMany({
        data: t.schoolSettings.map((s) => ({
          ...s,
          created_at: parseDateOrDefault(s.created_at),
          updated_at: parseDateOrDefault(s.updated_at),
        })),
      });
    }
    if (t.categories?.length) {
      await tx.activityCategory.createMany({ data: t.categories });
    }
    if (t.gradeLevels?.length) {
      await tx.gradeLevel.createMany({ data: t.gradeLevels });
    }
    if (t.sections?.length) {
      await tx.section.createMany({ data: t.sections });
    }
    if (t.classGroups?.length) {
      await tx.classGroup.createMany({ data: t.classGroups });
    }
    if (t.students?.length) {
      await tx.student.createMany({
        data: t.students.map((s) => ({
          ...s,
          created_at: parseDateOrDefault(s.created_at),
          updated_at: parseDateOrDefault(s.updated_at),
          archived_at: parseDateOrNull(s.archived_at),
        })),
      });
    }
    if (t.enrollments?.length) {
      await tx.studentEnrollment.createMany({
        data: t.enrollments.map((e) => ({
          ...e,
          enrolled_from: parseDateOrDefault(e.enrolled_from),
          enrolled_to: parseDateOrNull(e.enrolled_to),
          created_at: parseDateOrDefault(e.created_at),
          updated_at: parseDateOrDefault(e.updated_at),
        })),
      });
    }
    if (t.activities?.length) {
      await tx.activity.createMany({
        data: t.activities.map((a) => ({
          ...a,
          activity_date: parseDateOrDefault(a.activity_date),
          created_at: parseDateOrDefault(a.created_at),
          updated_at: parseDateOrDefault(a.updated_at),
          archived_at: parseDateOrNull(a.archived_at),
        })),
      });
    }
    if (t.participations?.length) {
      await tx.participation.createMany({
        data: t.participations.map((p) => ({
          ...p,
          created_at: parseDateOrDefault(p.created_at),
        })),
      });
    }
    if (t.attachments?.length) {
      await tx.activityAttachment.createMany({
        data: t.attachments.map((att) => ({
          ...att,
          byte_size: BigInt(att.byte_size),
          created_at: parseDateOrDefault(att.created_at),
          archived_at: parseDateOrNull(att.archived_at),
        })),
      });
    }
    if (t.importBatches?.length) {
      await tx.importBatch.createMany({
        data: t.importBatches.map((ib) => ({
          ...ib,
          created_at: parseDateOrDefault(ib.created_at),
          committed_at: parseDateOrNull(ib.committed_at),
        })),
      });
    }
    if (t.importErrors?.length) {
      await tx.importError.createMany({ data: t.importErrors });
    }
    if (t.auditLogs?.length) {
      await tx.auditLog.createMany({
        data: t.auditLogs.map((al) => ({
          ...al,
          occurred_at: parseDateOrDefault(al.occurred_at),
        })),
      });
    }
  });

  // Log restore audit
  await logAudit({
    actorUserId,
    action: "RESTORE_BACKUP",
    entityType: "backup_metadata",
    entityId: backupId,
    afterData: {
      sourceBackupId: backupId,
      sourceKey: meta.storage_key,
      safetyBackupKey: safetyBackup.storageKey,
    },
  });

  return {
    success: true,
    safetyBackupKey: safetyBackup.storageKey,
  };
}

/**
 * Deletes a backup record and its physical file
 */
export async function deleteSystemBackup(backupId: string, actorUserId?: string) {
  const meta = await prisma.backupMetadata.findUnique({
    where: { id: backupId },
  });

  if (!meta) throw new Error("سجل النسخة الاحتياطية غير موجود.");

  const filePath = path.join(BACKUPS_DIR, path.basename(meta.storage_key));
  try {
    await fs.unlink(filePath);
  } catch {
    // ignore if already deleted
  }

  await prisma.backupMetadata.delete({
    where: { id: backupId },
  });

  await logAudit({
    actorUserId,
    action: "DELETE_BACKUP",
    entityType: "backup_metadata",
    entityId: backupId,
    beforeData: { storageKey: meta.storage_key },
  });

  return true;
}
