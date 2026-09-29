"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { updateRolePermissions } from "@/lib/services/user-service";

export async function updateRolePermissionsAction(roleId: string, permissionIds: string[]) {
  try {
    const user = await requirePermission(PERMISSIONS.ROLE_MANAGE);
    await updateRolePermissions(roleId, permissionIds, user.id);
    revalidatePath("/roles");
    revalidatePath("/users");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "فشل تحديث صلاحيات الدور";
    return { error: msg };
  }
}
