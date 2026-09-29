"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  getCategories,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/lib/services/category-service";

export async function getCategoriesAction() {
  try {
    const list = await getCategories(true);
    return { success: true, categories: list };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "تعذر جلب التصنيفات";
    return { error: msg };
  }
}

export async function createCategoryAction(input: CreateCategoryInput) {
  try {
    const user = await requirePermission(PERMISSIONS.CATEGORY_MANAGE);
    const category = await createCategory(input, user.id);

    revalidatePath("/activities");
    revalidatePath("/activities/new");
    revalidatePath("/statistics");
    revalidatePath("/reports/stat");

    return { success: true, category };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "فشل إنشاء التصنيف";
    return { error: msg };
  }
}

export async function updateCategoryAction(id: string, input: UpdateCategoryInput) {
  try {
    const user = await requirePermission(PERMISSIONS.CATEGORY_MANAGE);
    const category = await updateCategory(id, input, user.id);

    revalidatePath("/activities");
    revalidatePath("/activities/new");
    revalidatePath("/statistics");
    revalidatePath("/reports/stat");

    return { success: true, category };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "فشل تعديل التصنيف";
    return { error: msg };
  }
}

export async function deleteCategoryAction(id: string) {
  try {
    const user = await requirePermission(PERMISSIONS.CATEGORY_MANAGE);
    await deleteCategory(id, user.id);

    revalidatePath("/activities");
    revalidatePath("/activities/new");
    revalidatePath("/statistics");
    revalidatePath("/reports/stat");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "فشل حذف التصنيف";
    return { error: msg };
  }
}

export async function toggleCategoryStatusAction(id: string) {
  try {
    const user = await requirePermission(PERMISSIONS.CATEGORY_MANAGE);
    const updated = await toggleCategoryStatus(id, user.id);

    revalidatePath("/activities");
    revalidatePath("/activities/new");
    revalidatePath("/statistics");
    revalidatePath("/reports/stat");

    return { success: true, category: updated };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "فشل تغيير حالة التصنيف";
    return { error: msg };
  }
}
