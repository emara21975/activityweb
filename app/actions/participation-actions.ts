"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { registerGroupParticipations, removeParticipation } from "@/lib/services/participation-service";
import { registerParticipationsSchema } from "@/lib/validation/schemas";

export async function registerParticipationsAction(
  prevState: { success?: boolean; error?: string; message?: string } | null,
  formData: FormData
) {
  try {
    const user = await requirePermission(PERMISSIONS.PARTICIPATION_CREATE);

    const activityId = formData.get("activity_id") as string;
    const studentIdsRaw = formData.getAll("student_ids") as string[];
    const notes = (formData.get("notes") as string) || null;

    const parsed = registerParticipationsSchema.safeParse({
      activity_id: activityId,
      student_ids: studentIdsRaw,
      notes,
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "بيانات غير صالحة" };
    }

    const result = await registerGroupParticipations({
      activityId: parsed.data.activity_id,
      studentIds: parsed.data.student_ids,
      notes: parsed.data.notes,
      actorUserId: user.id,
    });

    revalidatePath(`/activities/${activityId}`);
    revalidatePath("/activities");
    revalidatePath("/dashboard");
    revalidatePath("/students");

    return {
      success: true,
      message: result.message,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "حدث خطأ أثناء حفظ المشاركات";
    return { error: message };
  }
}

export async function removeParticipationAction(participationId: string, activityId: string) {
  const user = await requirePermission(PERMISSIONS.PARTICIPATION_REMOVE);
  await removeParticipation(participationId, user.id);
  revalidatePath(`/activities/${activityId}`);
  revalidatePath("/dashboard");
}
