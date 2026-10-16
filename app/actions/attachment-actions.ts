"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { saveActivityAttachment, archiveAttachment } from "@/lib/storage/attachment-service";
import { assertActivityInScope } from "@/lib/auth/activity-scope";
import { prisma } from "@/lib/db/prisma";

export async function uploadAttachmentAction(
  prevState: { success?: boolean; error?: string } | null,
  formData: FormData
) {
  try {
    const user = await requirePermission(PERMISSIONS.ATTACHMENT_UPLOAD);

    const activityId = formData.get("activity_id") as string;
    const file = formData.get("file") as File;

    if (!file || file.size === 0) {
      return { error: "يرجى اختيار ملف المرفق." };
    }

    await assertActivityInScope(user, activityId);

    const record = await saveActivityAttachment({
      activityId,
      file,
      actorUserId: user.id,
    });

    revalidatePath(`/activities/${activityId}`);
    revalidatePath("/activities");
    return {
      success: true,
      attachment: {
        id: record.id,
        activity_id: record.activity_id,
        original_name: record.original_name,
        storage_key: record.storage_key,
        mime_type: record.mime_type,
        byte_size: record.byte_size,
        checksum: record.checksum,
        uploaded_by_id: record.uploaded_by_id,
        created_at: record.created_at,
        archived_at: record.archived_at,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "حدث خطأ أثناء رفع المرفق";
    return { error: msg };
  }
}

import { getSession } from "@/lib/auth/session";

export async function archiveAttachmentAction(attachmentId: string, activityId: string) {
  try {
    const session = await getSession();
    if (!session || !session.user || !session.user.is_active) {
      return { error: "يرجى تسجيل الدخول أولاً لتنفيذ هذا الإجراء." };
    }

    const user = session.user;
    const isSuperAdmin = user.roles.includes("SUPER_ADMIN");
    const isSchoolAdmin = user.roles.includes("SCHOOL_ADMIN");
    const hasPerm = user.permissions.includes(PERMISSIONS.ATTACHMENT_REMOVE);

    if (!isSuperAdmin && !isSchoolAdmin && !hasPerm) {
      return { error: "ليس لديك صلاحية لحذف المرفقات." };
    }

    // Scope is checked against the attachment's own activity
    const attachment = await prisma.activityAttachment.findUnique({
      where: { id: attachmentId },
      select: { activity_id: true },
    });
    if (!attachment) return { error: "المرفق غير موجود." };
    await assertActivityInScope(user, attachment.activity_id);

    await archiveAttachment(attachmentId, user.id);
    revalidatePath(`/activities/${activityId}`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "حدث خطأ أثناء حذف المرفق";
    return { error: msg };
  }
}
