"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";

export async function updateActivityReportAction(activityId: string, formData: FormData) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
  });

  if (!activity) {
    throw new Error("Activity not found");
  }

  // Parse existing notes or empty object
  let existingData: Record<string, any> = {};
  if (activity.notes) {
    try {
      existingData = JSON.parse(activity.notes);
    } catch {
      existingData = { raw_notes: activity.notes };
    }
  }

  const updatedReport = {
    ...existingData,
    activity_type: formData.get("activity_type")?.toString() || "خطة معتمدة",
    activity_type_other: formData.get("activity_type_other")?.toString() || "",
    target_group: formData.get("target_group")?.toString() || "جميع طلاب المدرسة",
    responsible_department: formData.get("responsible_department")?.toString() || "قسم الأنشطة المدرسية",
    external_entity: formData.get("external_entity")?.toString() || "",
    external_honored: formData.get("external_honored") === "true",
    parent_participation: formData.get("parent_participation") === "true",
    activation_method: formData.get("activation_method")?.toString() || "فعالية",
    activation_method_other: formData.get("activation_method_other")?.toString() || "",
    objectives: formData.get("objectives")?.toString() || "",
    execution_steps: formData.get("execution_steps")?.toString() || "",
    safety_measures: formData.get("safety_measures")?.toString() || "",
    student_satisfaction: parseInt(formData.get("student_satisfaction")?.toString() || "5", 10),
    activity_quality: parseInt(formData.get("activity_quality")?.toString() || "5", 10),
    recommendations: formData.get("recommendations")?.toString() || "",
    supervisor_name: formData.get("supervisor_name")?.toString() || "",
    principal_name: formData.get("principal_name")?.toString() || "",
    updated_at: new Date().toISOString(),
  };

  await prisma.activity.update({
    where: { id: activityId },
    data: {
      notes: JSON.stringify(updatedReport),
      updated_by_id: session.user.id,
    },
  });

  revalidatePath(`/activities/${activityId}`);
  return { success: true };
}
