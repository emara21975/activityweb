import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { generateStudentsImportTemplate } from "@/lib/services/excel-service";

export async function GET() {
  const session = await getSession();

  if (!session || !session.user || !session.user.is_active) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const isSuperAdmin = session.user.roles.includes("SUPER_ADMIN");
  const canImport = isSuperAdmin || session.user.permissions.includes(PERMISSIONS.STUDENT_IMPORT);

  if (!canImport) {
    return new NextResponse("Forbidden: ليس لديك صلاحية لاستيراد بيانات الطلاب.", { status: 403 });
  }

  const buffer = await generateStudentsImportTemplate();

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="students_import_template.xlsx"',
    },
  });
}
