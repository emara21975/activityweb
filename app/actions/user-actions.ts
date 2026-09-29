"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createUser, updateUser } from "@/lib/services/user-service";
import { createUserSchema, updateUserSchema } from "@/lib/validation/schemas";

export async function createUserAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.USER_CREATE);

  const raw = {
    username: formData.get("username") as string,
    display_name: formData.get("display_name") as string,
    email: (formData.get("email") as string) || "",
    password: formData.get("password") as string,
    role_ids: formData.getAll("role_ids") as string[],
  };

  const parsed = createUserSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "بيانات غير صالحة");
  }

  await createUser(parsed.data, user.id);
  revalidatePath("/users");
}

export async function toggleUserStatusAction(userId: string, currentStatus: boolean, roleIds: string[]) {
  const user = await requirePermission(PERMISSIONS.USER_DEACTIVATE);
  const targetUser = await updateUser(
    userId,
    {
      display_name: "", // Will be preserved by existing or we can update directly
      is_active: !currentStatus,
      role_ids: roleIds,
    },
    user.id
  );

  revalidatePath("/users");
}
