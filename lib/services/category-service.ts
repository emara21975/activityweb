import { prisma } from "../db/prisma";
import { logAudit } from "../audit/audit-service";

export interface CategoryWithCount {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string | null;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
  activitiesCount: number;
}

export async function getCategories(includeInactive = true): Promise<CategoryWithCount[]> {
  const categories = await prisma.activityCategory.findMany({
    where: includeInactive ? {} : { is_active: true },
    orderBy: { sort_order: "asc" },
    include: {
      _count: {
        select: {
          activities: {
            where: { archived_at: null },
          },
        },
      },
    },
  });

  return categories.map((c) => ({
    id: c.id,
    code: c.code,
    name_ar: c.name_ar,
    name_en: c.name_en,
    description: c.description,
    sort_order: c.sort_order,
    is_active: c.is_active,
    activitiesCount: c._count.activities,
  }));
}

export interface CreateCategoryInput {
  name_ar: string;
  code?: string;
  name_en?: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}

export async function createCategory(input: CreateCategoryInput, actorUserId?: string) {
  const name_ar = input.name_ar.trim();
  if (!name_ar) {
    throw new Error("اسم التصنيف بالعربية مطلوب.");
  }

  // Generate code if not provided
  let code = input.code?.trim().toUpperCase();
  if (!code) {
    const count = await prisma.activityCategory.count();
    code = `CAT_${count + 1}_${Date.now().toString().slice(-4)}`;
  } else {
    // Check uniqueness
    const existing = await prisma.activityCategory.findUnique({
      where: { code },
    });
    if (existing) {
      throw new Error(`الرمز الكودي (${code}) مستخدم مسبقاً لتصنيف آخر. يرجى اختيار رمز كودي مختلف.`);
    }
  }

  // Determine sort_order
  let sort_order = input.sort_order;
  if (sort_order === undefined || sort_order === null) {
    const maxOrder = await prisma.activityCategory.aggregate({
      _max: { sort_order: true },
    });
    sort_order = (maxOrder._max.sort_order ?? 0) + 1;
  }

  const category = await prisma.activityCategory.create({
    data: {
      code,
      name_ar,
      name_en: input.name_en?.trim() || null,
      description: input.description?.trim() || null,
      sort_order,
      is_active: input.is_active ?? true,
    },
  });

  await logAudit({
    actorUserId,
    action: "CREATE_CATEGORY",
    entityType: "activity_category",
    entityId: category.id,
    afterData: category,
  });

  return category;
}

export interface UpdateCategoryInput {
  name_ar?: string;
  code?: string;
  name_en?: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}

export async function updateCategory(id: string, input: UpdateCategoryInput, actorUserId?: string) {
  const existing = await prisma.activityCategory.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("التصنيف المطلوب تعديله غير موجود.");
  }

  const data: {
    name_ar?: string;
    code?: string;
    name_en?: string | null;
    description?: string | null;
    sort_order?: number;
    is_active?: boolean;
  } = {};

  if (input.name_ar !== undefined) {
    const trimmed = input.name_ar.trim();
    if (!trimmed) throw new Error("اسم التصنيف بالعربية مطلوب.");
    data.name_ar = trimmed;
  }

  if (input.code !== undefined) {
    const trimmedCode = input.code.trim().toUpperCase();
    if (!trimmedCode) throw new Error("الرمز الكودي للتصنيف مطلوب.");
    if (trimmedCode !== existing.code) {
      const codeCheck = await prisma.activityCategory.findUnique({
        where: { code: trimmedCode },
      });
      if (codeCheck && codeCheck.id !== id) {
        throw new Error(`الرمز الكودي (${trimmedCode}) مستخدم مسبقاً.`);
      }
      data.code = trimmedCode;
    }
  }

  if (input.name_en !== undefined) {
    data.name_en = input.name_en?.trim() || null;
  }

  if (input.description !== undefined) {
    data.description = input.description?.trim() || null;
  }

  if (input.sort_order !== undefined) {
    data.sort_order = input.sort_order;
  }

  if (input.is_active !== undefined) {
    data.is_active = input.is_active;
  }

  const updated = await prisma.activityCategory.update({
    where: { id },
    data,
  });

  await logAudit({
    actorUserId,
    action: "UPDATE_CATEGORY",
    entityType: "activity_category",
    entityId: id,
    beforeData: existing,
    afterData: updated,
  });

  return updated;
}

export async function deleteCategory(id: string, actorUserId?: string) {
  const existing = await prisma.activityCategory.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          activities: {
            where: { archived_at: null },
          },
        },
      },
    },
  });

  if (!existing) {
    throw new Error("التصنيف المطلوب حذفه غير موجود.");
  }

  if (existing._count.activities > 0) {
    throw new Error(
      `لا يمكن حذف تصنيف "${existing.name_ar}" لوجود (${existing._count.activities}) نشاط مرتبط به حالياً. يمكنك تعطيل التصنيف بدلاً من حذفه.`
    );
  }

  await prisma.activityCategory.delete({
    where: { id },
  });

  await logAudit({
    actorUserId,
    action: "DELETE_CATEGORY",
    entityType: "activity_category",
    entityId: id,
    beforeData: existing,
  });

  return true;
}

export async function toggleCategoryStatus(id: string, actorUserId?: string) {
  const existing = await prisma.activityCategory.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("التصنيف غير موجود.");
  }

  const updated = await prisma.activityCategory.update({
    where: { id },
    data: { is_active: !existing.is_active },
  });

  await logAudit({
    actorUserId,
    action: "TOGGLE_CATEGORY_STATUS",
    entityType: "activity_category",
    entityId: id,
    beforeData: { is_active: existing.is_active },
    afterData: { is_active: updated.is_active },
  });

  return updated;
}
