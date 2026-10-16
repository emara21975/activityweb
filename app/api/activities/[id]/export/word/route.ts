import fs from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isActivityInScope } from "@/lib/auth/activity-scope";
import { resolveReportTemplate, ACTIVITY_REPORT_TEMPLATE_LABELS } from "@/lib/auth/report-template";
import { getActivityById } from "@/lib/services/activity-service";
import { getSchoolSettings } from "@/lib/services/school-settings-service";
import { generateActivityWordDocument } from "@/lib/services/word-export-service";
import { readTemplateImage, TemplateImage } from "@/lib/services/docx-template";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function loadPhotos(
  attachments: { mime_type: string; original_name: string; storage_key: string }[]
): Promise<TemplateImage[]> {
  const photos: TemplateImage[] = [];
  const candidates = attachments.filter(
    (att) => att.mime_type?.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp)$/i.test(att.original_name || "")
  );
  for (const att of candidates) {
    if (photos.length === 4) break;
    try {
      const buffer = await fs.readFile(path.join(process.cwd(), "storage", "attachments", att.storage_key));
      // Formats Word cannot embed (e.g. webp) are skipped
      const image = readTemplateImage(buffer);
      if (image) photos.push(image);
    } catch {
      // Missing file on disk: leave the frame empty
    }
  }
  return photos;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const [activity, schoolSettings] = await Promise.all([getActivityById(id), getSchoolSettings()]);

    if (!activity || !isActivityInScope(session.user, activity)) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const template = resolveReportTemplate(session.user.roles, request.nextUrl.searchParams.get("template"));
    const schoolName = schoolSettings?.school_name_ar || "مدرسة عبد الله بن علي المسند الثانوية للبنين";

    // Report details are stored as JSON in activity.notes
    let reportData: any = {};
    if (activity.notes) {
      try {
        reportData = JSON.parse(activity.notes);
      } catch {
        reportData = { objectives: activity.notes };
      }
    }

    const students = activity.participations.map((p) => {
      const grade = p.enrollment?.class_group.grade_level.name_ar;
      const section = p.enrollment?.class_group.section.name;
      return {
        personal_number: p.student.personal_number || p.student.academic_number || "",
        name: p.student.full_name_ar,
        class_name: [grade, section].filter(Boolean).join("/"),
        nationality:
          p.student.nationality || (p.student.nationality_group === "QATARI" ? "قطري" : "غير قطري"),
        attendance: "حاضر",
      };
    });

    const docxBuffer = await generateActivityWordDocument(
      {
        school_name: schoolName,
        academic_year: activity.academic_year?.name,
        name: activity.name,
        activity_date: new Date(activity.activity_date).toISOString(),
        time_period: reportData.time_period || "",
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
        objectives: reportData.objectives || "تنمية معارف ومهارات الطلاب القيادية والإبداعية",
        execution_steps:
          reportData.execution_steps ||
          "1. الإعداد والتنسيق المسبق للفعالية\n2. تنفيذ البرنامج بحضور الطلاب المستهدفين\n3. التقييم والتوثيق الميداني",
        safety_measures:
          reportData.safety_measures || "الالتزام التام بإجراءات السلامة المعتمدة وتوفير الإشراف الميداني الكامل",
        student_satisfaction: reportData.student_satisfaction ?? 5,
        activity_quality: reportData.activity_quality ?? 5,
        recommendations: reportData.recommendations || "مواصلة تنظيم مثل هذه الفعاليات وتكريم الطلاب المتميزين",
        photos: await loadPhotos(activity.attachments || []),
        students,
      },
      template
    );

    const safeName = activity.name.replace(/[\\/:*?"<>|]/g, "_");
    const fullFilename = `${ACTIVITY_REPORT_TEMPLATE_LABELS[template]} - ${safeName}.docx`;

    return new NextResponse(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="activity_${activity.id}.docx"; filename*=UTF-8''${encodeURIComponent(fullFilename)}`,
      },
    });
  } catch (error: any) {
    console.error("Word export error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate Word document" }, { status: 500 });
  }
}
