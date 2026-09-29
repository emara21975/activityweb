"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  parseAndPreviewStudentsExcel,
  commitStudentImportBatch,
} from "@/lib/services/import-service";

export async function uploadStudentsExcelAction(
  prevState: unknown,
  formData: FormData
) {
  try {
    const user = await requirePermission(PERMISSIONS.STUDENT_IMPORT);

    const file = formData.get("file") as File;
    const academicYearId = formData.get("academic_year_id") as string;

    if (!file || file.size === 0) {
      return { error: "يرجى اختيار ملف إكسل بصيغة XLSX." };
    }

    if (!academicYearId) {
      return { error: "يرجى اختيار العام الدراسي المستهدف للاستيراد." };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const preview = await parseAndPreviewStudentsExcel(
      buffer,
      file.name,
      academicYearId,
      user.id
    );

    return {
      success: true,
      preview,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "حدث خطأ أثناء معالجة ملف الإكسل";
    return { error: msg };
  }
}

export async function commitStudentsImportAction(batchId: string) {
  const user = await requirePermission(PERMISSIONS.STUDENT_IMPORT);
  const result = await commitStudentImportBatch(batchId, user.id);

  revalidatePath("/students");
  revalidatePath("/dashboard");
  revalidatePath("/imports");

  return result;
}
