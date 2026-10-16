"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createUser, updateUser, setUserActive, deleteUser } from "@/lib/services/user-service";
import { createUserSchema, updateUserSchema } from "@/lib/validation/schemas";

type ActionResult = { success: true } | { error: string };

function toError(err: unknown, fallback: string): ActionResult {
  return { error: err instanceof Error ? err.message.replace(/^(FORBIDDEN|UNAUTHORIZED): /, "") : fallback };
}

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

export async function updateUserAction(input: {
  id: string;
  username: string;
  display_name: string;
  email: string;
  password: string;
  is_active: boolean;
  role_ids: string[];
}): Promise<ActionResult> {
  try {
    const actor = await requirePermission(PERMISSIONS.USER_UPDATE);
    const parsed = updateUserSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message || "بيانات غير صالحة" };

    if (parsed.data.id === actor.id && !parsed.data.is_active) {
      return { error: "لا يمكنك تعطيل حسابك الحالي." };
    }

    await updateUser(parsed.data.id, parsed.data, actor.id);
    revalidatePath("/users");
    return { success: true };
  } catch (err) {
    return toError(err, "فشل تحديث بيانات المستخدم");
  }
}

export async function toggleUserStatusAction(userId: string, isActive: boolean): Promise<ActionResult> {
  try {
    const actor = await requirePermission(PERMISSIONS.USER_DEACTIVATE);
    if (userId === actor.id && !isActive) return { error: "لا يمكنك تعطيل حسابك الحالي." };

    await setUserActive(userId, isActive, actor.id);
    revalidatePath("/users");
    return { success: true };
  } catch (err) {
    return toError(err, "فشل تغيير حالة المستخدم");
  }
}

export async function deleteUserAction(userId: string): Promise<ActionResult> {
  try {
    const actor = await requirePermission(PERMISSIONS.USER_DELETE);
    if (userId === actor.id) return { error: "لا يمكنك حذف حسابك الحالي." };

    await deleteUser(userId, actor.id);
    revalidatePath("/users");
    return { success: true };
  } catch (err) {
    return toError(err, "فشل حذف المستخدم");
  }
}
