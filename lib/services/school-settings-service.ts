import { prisma } from "../db/prisma";
import { logAudit } from "../audit/audit-service";

export async function getSchoolSettings() {
  let settings = await prisma.schoolSettings.findFirst({
    include: {
      current_academic_year: true,
    },
  });

  if (!settings) {
    settings = await prisma.schoolSettings.create({
      data: {
        school_name_ar: "مدرسة قطر للتعليم الثانوي",
        school_name_en: "Qatar Secondary School",
        supervisor_name: "مشرف الأنشطة المدرسية",
      },
      include: {
        current_academic_year: true,
      },
    });
  }

  return settings;
}

export async function updateSchoolSettings(
  data: {
    school_name_ar: string;
    school_name_en?: string | null;
    school_code?: string | null;
    supervisor_name?: string | null;
    current_academic_year_id?: string | null;
  },
  actorUserId?: string
) {
  const current = await getSchoolSettings();

  const updated = await prisma.schoolSettings.update({
    where: { id: current.id },
    data: {
      school_name_ar: data.school_name_ar,
      school_name_en: data.school_name_en,
      school_code: data.school_code,
      supervisor_name: data.supervisor_name,
      current_academic_year_id: data.current_academic_year_id,
    },
    include: {
      current_academic_year: true,
    },
  });

  await logAudit({
    actorUserId,
    action: "UPDATE",
    entityType: "school_settings",
    entityId: updated.id,
    beforeData: current,
    afterData: updated,
  });

  return updated;
}
