"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { updateSchoolSettings } from "@/lib/services/school-settings-service";
import { createAcademicYear, setCurrentAcademicYear, updateAcademicYearTerms } from "@/lib/services/academic-year-service";
import { schoolSettingsSchema, academicYearSchema } from "@/lib/validation/schemas";

export async function updateSchoolSettingsAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.SCHOOL_SETTINGS_MANAGE);

  const raw = {
    school_name_ar: formData.get("school_name_ar") as string,
    school_name_en: formData.get("school_name_en") as string || null,
    school_code: formData.get("school_code") as string || null,
    supervisor_name: formData.get("supervisor_name") as string || null,
    current_academic_year_id: formData.get("current_academic_year_id") as string || null,
  };

  const parsed = schoolSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "بيانات غير صالحة");
  }

  await updateSchoolSettings(parsed.data, user.id);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function createAcademicYearAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.ACADEMIC_YEAR_MANAGE);

  const raw = {
    name: formData.get("name") as string,
    start_date: formData.get("start_date") as string,
    end_date: formData.get("end_date") as string,
    is_current: formData.get("is_current") === "on",
  };

  const parsed = academicYearSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "بيانات غير صالحة");
  }

  await createAcademicYear(parsed.data, user.id);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function setCurrentAcademicYearAction(yearId: string) {
  const user = await requirePermission(PERMISSIONS.ACADEMIC_YEAR_MANAGE);
  await setCurrentAcademicYear(yearId, user.id);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function updateAcademicYearTermsAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.ACADEMIC_YEAR_MANAGE);

  const academicYearId = formData.get("academic_year_id") as string;
  if (!academicYearId) {
    throw new Error("العام الدراسي غير محدد");
  }

  const term1_start_date = (formData.get("term1_start_date") as string) || null;
  const term1_end_date = (formData.get("term1_end_date") as string) || null;
  const term2_start_date = (formData.get("term2_start_date") as string) || null;
  const term2_end_date = (formData.get("term2_end_date") as string) || null;

  await updateAcademicYearTerms(
    academicYearId,
    {
      term1_start_date,
      term1_end_date,
      term2_start_date,
      term2_end_date,
    },
    user.id
  );

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
