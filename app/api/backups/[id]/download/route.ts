import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getBackupFileForDownload } from "@/lib/services/backup-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const session = await getSession();

  if (!session || !session.user || !session.user.is_active) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const isSuperAdmin = session.user.roles.includes("SUPER_ADMIN");
  const canDownload =
    isSuperAdmin ||
    session.user.permissions.includes(PERMISSIONS.BACKUP_CREATE) ||
    session.user.permissions.includes(PERMISSIONS.BACKUP_RESTORE);

  if (!canDownload) {
    return new NextResponse("Forbidden: ليس لديك صلاحية لتحميل النسخ الاحتياطية.", {
      status: 403,
    });
  }

  const { id } = await params;

  try {
    const { content, filename } = await getBackupFileForDownload(id);

    return new NextResponse(new Uint8Array(content), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "تعذر تحميل النسخة الاحتياطية";
    return new NextResponse(msg, { status: 404 });
  }
}
