"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createStudent, updateStudent } from "@/lib/services/student-service";
import { studentSchema } from "@/lib/validation/schemas";

export async function createStudentAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.STUDENT_CREATE);

  const raw = {
    academic_number: (formData.get("academic_number") as string) || null,
    personal_number: (formData.get("personal_number") as string) || null,
    full_name_ar: formData.get("full_name_ar") as string,
    full_name_en: (formData.get("full_name_en") as string) || null,
    nationality: (formData.get("nationality") as string) || null,
    nationality_group: (formData.get("nationality_group") as "QATARI" | "NON_QATARI") || null,
    notes: (formData.get("notes") as string) || null,
    grade_level_id: (formData.get("grade_level_id") as string) || null,
    section_id: (formData.get("section_id") as string) || null,
    academic_year_id: (formData.get("academic_year_id") as string) || null,
  };

  const parsed = studentSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "بيانات غير صالحة");
  }

  const student = await createStudent(parsed.data, user.id);
  revalidatePath("/students");
  revalidatePath("/dashboard");
  redirect(`/students/${student.id}`);
}

export async function updateStudentAction(id: string, formData: FormData) {
  const user = await requirePermission(PERMISSIONS.STUDENT_UPDATE);

  const raw = {
    academic_number: (formData.get("academic_number") as string) || null,
    personal_number: (formData.get("personal_number") as string) || null,
    full_name_ar: formData.get("full_name_ar") as string,
    full_name_en: (formData.get("full_name_en") as string) || null,
    nationality: (formData.get("nationality") as string) || null,
    nationality_group: (formData.get("nationality_group") as "QATARI" | "NON_QATARI") || null,
    notes: (formData.get("notes") as string) || null,
    is_active: formData.get("is_active") === "on",
  };

  const parsed = studentSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "بيانات غير صالحة");
  }

  await updateStudent(id, parsed.data, user.id);
  revalidatePath(`/students/${id}`);
  revalidatePath("/students");
  revalidatePath("/dashboard");
}

export async function toggleStudentStatusAction(id: string, currentStatus: boolean) {
  const user = await requirePermission(PERMISSIONS.STUDENT_UPDATE);
  await updateStudent(id, { is_active: !currentStatus }, user.id);
  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  revalidatePath("/dashboard");
  return { success: true, is_active: !currentStatus };
}

export async function quickUpdateStudentAction(
  id: string,
  data: {
    academic_number?: string | null;
    personal_number?: string | null;
    full_name_ar: string;
    full_name_en?: string | null;
    nationality?: string | null;
    nationality_group?: "QATARI" | "NON_QATARI" | null;
    notes?: string | null;
    is_active?: boolean;
  }
) {
  const user = await requirePermission(PERMISSIONS.STUDENT_UPDATE);
  if (!data.full_name_ar || !data.full_name_ar.trim()) {
    throw new Error("اسم الطالب بالعربية مطلوب");
  }
  await updateStudent(id, data, user.id);
  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  revalidatePath("/dashboard");
  return { success: true };
}

