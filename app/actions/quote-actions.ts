"use server";

import { revalidatePath } from "next/cache";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { requirePermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  getInspirationalQuotes,
  createInspirationalQuote,
  updateInspirationalQuote,
  deleteInspirationalQuote,
  toggleInspirationalQuoteStatus,
  CreateQuoteInput,
  UpdateQuoteInput,
} from "@/lib/services/quote-service";

const BANNERS_DIR = path.join(process.cwd(), "public", "banners");

export async function getQuotesAction() {
  try {
    const quotes = await getInspirationalQuotes(false);
    return { success: true, quotes };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "تعذر جلب العبارات التحفيزية";
    return { error: msg };
  }
}

export async function createQuoteAction(input: CreateQuoteInput) {
  try {
    const user = await requirePermission(PERMISSIONS.SCHOOL_SETTINGS_MANAGE);
    const quote = await createInspirationalQuote(input, user.id);

    revalidatePath("/", "layout");
    return { success: true, quote };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "فشل إنشاء العبارة التحفيزية";
    return { error: msg };
  }
}

export async function updateQuoteAction(id: string, input: UpdateQuoteInput) {
  try {
    const user = await requirePermission(PERMISSIONS.SCHOOL_SETTINGS_MANAGE);
    const quote = await updateInspirationalQuote(id, input, user.id);

    revalidatePath("/", "layout");
    return { success: true, quote };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "فشل تعديل العبارة التحفيزية";
    return { error: msg };
  }
}

export async function deleteQuoteAction(id: string) {
  try {
    const user = await requirePermission(PERMISSIONS.SCHOOL_SETTINGS_MANAGE);
    await deleteInspirationalQuote(id, user.id);

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "فشل حذف العبارة التحفيزية";
    return { error: msg };
  }
}

export async function toggleQuoteStatusAction(id: string) {
  try {
    const user = await requirePermission(PERMISSIONS.SCHOOL_SETTINGS_MANAGE);
    const updated = await toggleInspirationalQuoteStatus(id, user.id);

    revalidatePath("/", "layout");
    return { success: true, quote: updated };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "فشل تغيير حالة العبارة";
    return { error: msg };
  }
}

export async function uploadQuoteImageAction(formData: FormData) {
  try {
    await requirePermission(PERMISSIONS.SCHOOL_SETTINGS_MANAGE);
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return { error: "يرجى اختيار ملف صورة صالح." };
    }

    if (file.size > 10 * 1024 * 1024) {
      return { error: "حجم الصورة يتجاوز الحد المسموح (10 ميغابايت)." };
    }

    await fs.mkdir(BANNERS_DIR, { recursive: true });

    const ext = path.extname(file.name).toLowerCase() || ".jpg";
    const randomHex = crypto.randomBytes(6).toString("hex");
    const filename = `banner-${Date.now()}-${randomHex}${ext}`;
    const destinationPath = path.join(BANNERS_DIR, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(destinationPath, buffer);

    const imageUrl = `/banners/${filename}`;
    return { success: true, imageUrl };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "فشل رفع الصورة";
    return { error: msg };
  }
}
