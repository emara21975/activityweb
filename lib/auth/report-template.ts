import { SYSTEM_ROLES } from "./permissions";

/**
 * Which official Word form a user gets for an activity report:
 *  - SPECIALIST: petrol form, إدارة شؤون المدارس header (أخصائي الأنشطة)
 *  - ANNUAL:     maroon form with the school header — the school's annual report (المعلم)
 */
export type ActivityReportTemplate = "SPECIALIST" | "ANNUAL";

export const ACTIVITY_REPORT_TEMPLATE_LABELS: Record<ActivityReportTemplate, string> = {
  SPECIALIST: "تقرير أخصائي الأنشطة",
  ANNUAL: "تقرير الأنشطة السنوي للمدرسة",
};

const ADMIN_ROLES: string[] = [SYSTEM_ROLES.SUPER_ADMIN, SYSTEM_ROLES.SCHOOL_ADMIN];

/**
 * Templates the user may export. Admins get both; the activity specialist gets
 * the specialist form; everyone else (teachers, data entry…) the annual school form.
 */
export function getAllowedReportTemplates(roles: string[]): ActivityReportTemplate[] {
  if (roles.some((r) => ADMIN_ROLES.includes(r))) return ["SPECIALIST", "ANNUAL"];
  if (roles.includes(SYSTEM_ROLES.ACTIVITY_SUPERVISOR)) return ["SPECIALIST"];
  return ["ANNUAL"];
}

/** The requested template if allowed, otherwise the user's default (first allowed). */
export function resolveReportTemplate(roles: string[], requested?: string | null): ActivityReportTemplate {
  const allowed = getAllowedReportTemplates(roles);
  const wanted = requested?.toUpperCase();
  return allowed.find((t) => t === wanted) ?? allowed[0];
}
