import { z } from "zod";

// Auth
export const loginSchema = z.object({
  username: z.string().min(1, "اسم المستخدم مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export const createUserSchema = z.object({
  username: z.string().min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل").regex(/^[a-zA-Z0-9_.-]+$/, "اسم المستخدم يحتوي أحرف غير مسموحة"),
  display_name: z.string().min(2, "الاسم الظاهر مطلوب"),
  email: z.string().email("بريد إلكتروني غير صالح").optional().or(z.literal("")),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  role_ids: z.array(z.string()).min(1, "يجب تحديد دور واحد على الأقل"),
});

export const updateUserSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string().min(2, "الاسم الظاهر مطلوب"),
  email: z.string().email("بريد إلكتروني غير صالح").optional().or(z.literal("")),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل").optional().or(z.literal("")),
  is_active: z.boolean(),
  role_ids: z.array(z.string()).min(1, "يجب تحديد دور واحد على الأقل"),
});

// School Settings
export const schoolSettingsSchema = z.object({
  school_name_ar: z.string().min(3, "اسم المدرسة بالعربية مطلوب"),
  school_name_en: z.string().optional().nullable(),
  school_code: z.string().optional().nullable(),
  supervisor_name: z.string().optional().nullable(),
  current_academic_year_id: z.string().uuid("يرجى اختيار عام دراسي صحيح").optional().nullable(),
});

// Academic Year
export const academicYearSchema = z.object({
  name: z.string().min(4, "اسم العام الدراسي مطلوب (مثال: 2026-2027)"),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ البداية غير صالح (YYYY-MM-DD)"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ النهاية غير صالح (YYYY-MM-DD)"),
  is_current: z.boolean().default(false),
}).refine((data) => new Date(data.start_date) <= new Date(data.end_date), {
  message: "تاريخ بداية العام يجب أن يكون قبل أو يساوي تاريخ النهاية",
  path: ["end_date"],
});

// Student
export const studentSchema = z.object({
  academic_number: z.string().trim().optional().nullable(),
  personal_number: z.string().trim().optional().nullable(),
  full_name_ar: z.string().trim().min(3, "اسم الطالب بالعربية مطلوب (3 أحرف على الأقل)"),
  full_name_en: z.string().trim().optional().nullable(),
  nationality: z.string().trim().optional().nullable(),
  nationality_group: z.enum(["QATARI", "NON_QATARI"]).optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  // Initial enrollment fields
  grade_level_id: z.string().uuid().optional().nullable(),
  section_id: z.string().uuid().optional().nullable(),
  academic_year_id: z.string().uuid().optional().nullable(),
});

// Activity
export const activitySchema = z.object({
  name: z.string().trim().min(3, "اسم النشاط مطلوب"),
  category_id: z.string().uuid("يرجى اختيار تصنيف النشاط"),
  academic_year_id: z.string().uuid("يرجى اختيار العام الدراسي"),
  activity_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ النشاط غير صالح (YYYY-MM-DD)"),
  status: z.enum(["PLANNED", "COMPLETED", "CANCELLED"]).default("COMPLETED"),
  notes: z.string().trim().optional().nullable(),
});

// Participation Group Registration
export const registerParticipationsSchema = z.object({
  activity_id: z.string().uuid("معرف النشاط غير صالح"),
  student_ids: z.array(z.string().uuid()).min(1, "يجب تحديد طالب واحد على الأقل"),
  notes: z.string().trim().optional().nullable(),
});
