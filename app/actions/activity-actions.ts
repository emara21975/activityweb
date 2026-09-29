"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { createActivity, updateActivity, archiveActivity } from "@/lib/services/activity-service";
import { activitySchema } from "@/lib/validation/schemas";

export async function createActivityAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.ACTIVITY_CREATE);

  const raw = {
    name: formData.get("name") as string,
    category_id: formData.get("category_id") as string,
    academic_year_id: formData.get("academic_year_id") as string,
    activity_date: formData.get("activity_date") as string,
    status: (formData.get("status") as "PLANNED" | "COMPLETED" | "CANCELLED") || "COMPLETED",
    notes: (formData.get("notes") as string) || null,
  };

  const parsed = activitySchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "بيانات غير صالحة");
  }

  const act = await createActivity(parsed.data, user.id);
  revalidatePath("/activities");
  revalidatePath("/dashboard");
  redirect(`/activities/${act.id}`);
}

export async function updateActivityAction(id: string, formData: FormData) {
  const user = await requirePermission(PERMISSIONS.ACTIVITY_UPDATE);

  const raw = {
    name: formData.get("name") as string,
    category_id: formData.get("category_id") as string,
    academic_year_id: formData.get("academic_year_id") as string,
    activity_date: formData.get("activity_date") as string,
    status: (formData.get("status") as "PLANNED" | "COMPLETED" | "CANCELLED") || "COMPLETED",
    notes: (formData.get("notes") as string) || null,
  };

  const parsed = activitySchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "بيانات غير صالحة");
  }

  await updateActivity(id, parsed.data, user.id);
  revalidatePath(`/activities/${id}`);
  revalidatePath("/activities");
  revalidatePath("/dashboard");
}

export async function quickUpdateActivityAction(
  id: string,
  data: {
    name: string;
    category_id: string;
    activity_date: string;
    status: "PLANNED" | "COMPLETED" | "CANCELLED";
    notes?: string | null;
  }
) {
  const user = await requirePermission(PERMISSIONS.ACTIVITY_UPDATE);
  if (!data.name || !data.name.trim()) {
    throw new Error("اسم النشاط مطلوب");
  }

  // Preserve existing JSON structure if notes was JSON
  const current = await prisma.activity.findUnique({ where: { id } });
  let finalNotes = data.notes !== undefined ? (data.notes ? data.notes.trim() : null) : undefined;

  if (current?.notes && current.notes.trim().startsWith("{") && finalNotes !== undefined) {
    try {
      const existing = JSON.parse(current.notes);
      existing.objectives = finalNotes || "";
      existing.updated_at = new Date().toISOString();
      finalNotes = JSON.stringify(existing);
    } catch {
      // not JSON, keep as is
    }
  }

  await updateActivity(id, { ...data, notes: finalNotes }, user.id);
  revalidatePath(`/activities/${id}`);
  revalidatePath("/activities");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function toggleActivityStatusAction(id: string, newStatus: string) {
  const user = await requirePermission(PERMISSIONS.ACTIVITY_UPDATE);
  await updateActivity(id, { status: newStatus }, user.id);
  revalidatePath(`/activities/${id}`);
  revalidatePath("/activities");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function archiveActivityAction(id: string) {
  const user = await requirePermission(PERMISSIONS.ACTIVITY_ARCHIVE);
  await archiveActivity(id, user.id);
  revalidatePath("/activities");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateActivityVideoUrlAction(id: string, videoUrl: string | null) {
  const user = await requirePermission(PERMISSIONS.ACTIVITY_UPDATE);
  const current = await prisma.activity.findUnique({ where: { id } });
  if (!current) {
    throw new Error("النشاط غير موجود");
  }

  let reportData: Record<string, any> = {};
  if (current.notes) {
    try {
      reportData = JSON.parse(current.notes);
    } catch {
      reportData = { objectives: current.notes };
    }
  }

  const cleanUrl = videoUrl && videoUrl.trim() ? videoUrl.trim() : null;
  if (cleanUrl) {
    try {
      new URL(cleanUrl);
    } catch {
      throw new Error("رابط الفيديو غير صالح. يرجى إدخال رابط يبدأ بـ http:// أو https://");
    }
  }

  reportData.video_url = cleanUrl;
  reportData.updated_at = new Date().toISOString();

  await prisma.activity.update({
    where: { id },
    data: {
      notes: JSON.stringify(reportData),
      updated_by_id: user.id,
    },
  });

  revalidatePath(`/activities/${id}`);
  return { success: true, videoUrl: cleanUrl };
}


