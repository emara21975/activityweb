import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getActivityById } from "@/lib/services/activity-service";
import { getSchoolSettings } from "@/lib/services/school-settings-service";
import { generateActivityWordDocument } from "@/lib/services/word-export-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const [activity, schoolSettings] = await Promise.all([
      getActivityById(id),
      getSchoolSettings(),
    ]);

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const schoolName = schoolSettings?.school_name_ar || "مدرسة عبد الله بن علي المسند الثانوية للبنين";

    // Parse report details from notes if present
    let reportData: any = {};
    if (activity.notes) {
      try {
        reportData = JSON.parse(activity.notes);
      } catch {
        reportData = { objectives: activity.notes };
      }
    }

    // Extract up to 4 documentation photos
    const photoAttachments = (activity.attachments || [])
      .filter(
        (att: any) =>
          att.mime_type?.startsWith("image/") ||
          /\.(png|jpe?g|webp|gif)$/i.test(att.original_name || "")
      )
      .slice(0, 4);

    const photos = photoAttachments.map((att: any) => ({
      path: path.join(process.cwd(), "storage", "attachments", att.storage_key),
      original_name: att.original_name,
    }));

    const docxBuffer = await generateActivityWordDocument({
      school_name: schoolName,
      name: activity.name,
      activity_date: new Date(activity.activity_date).toISOString(),
      total_participants: activity.totalParticipants,
      qatari_count: activity.qatariCount,
      non_qatari_count: activity.nonQatariCount,
      activity_type: reportData.activity_type || "خطة معتمدة",
      activity_type_other: reportData.activity_type_other || "",
      target_group: reportData.target_group || "جميع طلاب المدرسة",
      responsible_department: reportData.responsible_department || `قسم ${activity.category.name_ar}`,
      external_entity: reportData.external_entity || "—",
      external_honored: Boolean(reportData.external_honored),
      parent_participation: Boolean(reportData.parent_participation),
      activation_method: reportData.activation_method || "فعالية",
      activation_method_other: reportData.activation_method_other || "",
      objectives: reportData.objectives || activity.notes || "تنمية معارف ومهارات الطلاب القيادية والإبداعية",
      execution_steps: reportData.execution_steps || "1. الإعداد والتنسيق المسبق للفعالية\n2. تنفيذ البرنامج بحضور الطلاب المستهدفين\n3. التقييم والتوثيق الميداني",
      safety_measures: reportData.safety_measures || "الالتزام التام بإجراءات السلامة المعتمدة وتوفير الإشراف الميداني الكامل",
      student_satisfaction: reportData.student_satisfaction ?? 5,
      activity_quality: reportData.activity_quality ?? 5,
      recommendations: reportData.recommendations || "مواصلة تنظيم مثل هذه الفعاليات وتكريم الطلاب المتميزين",
      photos,
    });

    const safeName = activity.name.replace(/[\\/:*?"<>|]/g, "_");
    const filename = `تقرير نشاط - ${encodeURIComponent(safeName)}.docx`;

    return new NextResponse(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error: any) {
    console.error("Word export error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate Word document" }, { status: 500 });
  }
}
