"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  createSystemBackup,
  restoreSystemBackup,
  deleteSystemBackup,
} from "@/lib/services/backup-service";

export async function createBackupAction() {
  try {
    const user = await requirePermission(PERMISSIONS.BACKUP_CREATE);
    const result = await createSystemBackup(user.id);
    revalidatePath("/backups");
    return { success: true, storageKey: result.storageKey };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "فشل إنشاء النسخة الاحتياطية";
    return { error: msg };
  }
}

export async function restoreBackupAction(backupId: string, confirmationText: string) {
  try {
    const user = await requirePermission(PERMISSIONS.BACKUP_RESTORE);

    if (confirmationText.trim() !== "تأكيد الاستعادة") {
      return { error: 'يرجى كتابة نص التأكيد بشكل مطابق: "تأكيد الاستعادة"' };
    }

    const result = await restoreSystemBackup(backupId, user.id);
    revalidatePath("/backups");
    revalidatePath("/dashboard");
    revalidatePath("/students");
    revalidatePath("/activities");
    return { success: true, safetyBackupKey: result.safetyBackupKey };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "فشلت عملية الاستعادة";
    return { error: msg };
  }
}

export async function deleteBackupAction(backupId: string) {
  try {
    const user = await requirePermission(PERMISSIONS.BACKUP_CREATE);
    await deleteSystemBackup(backupId, user.id);
    revalidatePath("/backups");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "فشل حذف النسخة الاحتياطية";
    return { error: msg };
  }
}
