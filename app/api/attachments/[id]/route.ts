import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getAttachmentForDownload } from "@/lib/storage/attachment-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const session = await getSession();

  if (!session || !session.user || !session.user.is_active) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const isSuperAdmin = session.user.roles.includes("SUPER_ADMIN");
  const canView = isSuperAdmin || session.user.permissions.includes(PERMISSIONS.ATTACHMENT_VIEW);

  if (!canView) {
    return new NextResponse("Forbidden: ليس لديك صلاحية لتحميل المرفقات.", { status: 403 });
  }

  const { id } = await params;

  try {
    const { fileBuffer, originalName, mimeType } = await getAttachmentForDownload(id);

    const url = new URL(request.url);
    const isDownload = url.searchParams.get("download") === "1";
    const disposition = isDownload
      ? `attachment; filename*=UTF-8''${encodeURIComponent(originalName)}`
      : `inline; filename*=UTF-8''${encodeURIComponent(originalName)}`;

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": disposition,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "تعذر تحميل المرفق";
    return new NextResponse(msg, { status: 404 });
  }
}
