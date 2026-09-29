"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { executeDataPurge, PurgeOptions } from "@/lib/services/cleanup-service";

export async function purgeDataAction(options: Omit<PurgeOptions, "actorUserId">) {
  try {
    const user = await requirePermission(PERMISSIONS.BACKUP_RESTORE);

    const result = await executeDataPurge({
      ...options,
      actorUserId: user.id,
    });

    // Revalidate all pages that depend on data
    revalidatePath("/data-cleanup");
    revalidatePath("/dashboard");
    revalidatePath("/students");
    revalidatePath("/activities");
    revalidatePath("/participations");
    revalidatePath("/reports/stat");
    revalidatePath("/reports/act");
    revalidatePath("/reports/non-participants");
    revalidatePath("/statistics");
    revalidatePath("/backups");
    revalidatePath("/imports");
    revalidatePath("/audit-logs");

    return {
      success: true,
      message: result.message,
      details: result.details,
      safetyBackupKey: result.safetyBackupKey,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "فشلت عملية تفريغ وحذف البيانات";
    return { error: msg };
  }
}
