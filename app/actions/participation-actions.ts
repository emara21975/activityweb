"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { registerGroupParticipations, removeParticipation } from "@/lib/services/participation-service";
import { assertActivityInScope } from "@/lib/auth/activity-scope";
import { prisma } from "@/lib/db/prisma";
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

    await assertActivityInScope(user, parsed.data.activity_id);

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
  // Check the participation's real activity, not the activityId passed by the client
  const participation = await prisma.participation.findUnique({
    where: { id: participationId },
    select: { activity_id: true },
  });
  if (!participation) throw new Error("سجل المشاركة غير موجود.");
  await assertActivityInScope(user, participation.activity_id);
  await removeParticipation(participationId, user.id);
  revalidatePath(`/activities/${activityId}`);
  revalidatePath("/dashboard");
}
