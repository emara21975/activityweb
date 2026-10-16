export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: "dashboard.view",

  // Students
  STUDENT_VIEW: "student.view",
  STUDENT_CREATE: "student.create",
  STUDENT_UPDATE: "student.update",
  STUDENT_ARCHIVE: "student.archive",
  STUDENT_IMPORT: "student.import",
  STUDENT_EXPORT: "student.export",

  // Enrollments
  ENROLLMENT_VIEW: "enrollment.view",
  ENROLLMENT_MANAGE: "enrollment.manage",

  // Activities
  ACTIVITY_VIEW: "activity.view",
  ACTIVITY_VIEW_ALL: "activity.view_all",
  ACTIVITY_CREATE: "activity.create",
  ACTIVITY_UPDATE: "activity.update",
  ACTIVITY_ARCHIVE: "activity.archive",

  // Participations
  PARTICIPATION_VIEW: "participation.view",
  PARTICIPATION_CREATE: "participation.create",
  PARTICIPATION_UPDATE: "participation.update",
  PARTICIPATION_REMOVE: "participation.remove",

  // Reports & Statistics
  REPORT_VIEW: "report.view",
  REPORT_EXPORT: "report.export",
  STATISTICS_VIEW: "statistics.view",

  // Attachments
  ATTACHMENT_VIEW: "attachment.view",
  ATTACHMENT_UPLOAD: "attachment.upload",
  ATTACHMENT_REMOVE: "attachment.remove",

  // Academic Years
  ACADEMIC_YEAR_VIEW: "academic_year.view",
  ACADEMIC_YEAR_MANAGE: "academic_year.manage",

  // Categories
  CATEGORY_VIEW: "category.view",
  CATEGORY_MANAGE: "category.manage",

  // School Settings
  SCHOOL_SETTINGS_VIEW: "school_settings.view",
  SCHOOL_SETTINGS_MANAGE: "school_settings.manage",

  // Users
  USER_VIEW: "user.view",
  USER_CREATE: "user.create",
  USER_UPDATE: "user.update",
  USER_DEACTIVATE: "user.deactivate",
  USER_DELETE: "user.delete",

  // Roles
  ROLE_VIEW: "role.view",
  ROLE_MANAGE: "role.manage",

  // Audit Logs
  AUDIT_VIEW: "audit.view",

  // Backups
  BACKUP_CREATE: "backup.create",
  BACKUP_RESTORE: "backup.restore",
} as const;

export type PermissionCode = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export interface PermissionDefinition {
  code: PermissionCode;
  module: string;
  description: string;
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  { code: PERMISSIONS.DASHBOARD_VIEW, module: "dashboard", description: "عرض لوحة التحكم والإحصائيات السريعة" },

  { code: PERMISSIONS.STUDENT_VIEW, module: "student", description: "عرض بيانات وملفات الطلاب" },
  { code: PERMISSIONS.STUDENT_CREATE, module: "student", description: "إضافة طالب جديد" },
  { code: PERMISSIONS.STUDENT_UPDATE, module: "student", description: "تعديل بيانات الطالب" },
  { code: PERMISSIONS.STUDENT_ARCHIVE, module: "student", description: "أرشفة سجل الطالب" },
  { code: PERMISSIONS.STUDENT_IMPORT, module: "student", description: "استيراد بيانات الطلاب من ملف إكسل" },
  { code: PERMISSIONS.STUDENT_EXPORT, module: "student", description: "تصدير بيانات الطلاب إلى ملف إكسل" },

  { code: PERMISSIONS.ENROLLMENT_VIEW, module: "enrollment", description: "عرض تسجيلات الطلاب في الصفوف والشعب" },
  { code: PERMISSIONS.ENROLLMENT_MANAGE, module: "enrollment", description: "تسجيل ونقل الطلاب بين الصفوف والشعب" },

  { code: PERMISSIONS.ACTIVITY_VIEW, module: "activity", description: "عرض سجل الأنشطة المدرسية" },
  { code: PERMISSIONS.ACTIVITY_VIEW_ALL, module: "activity", description: "عرض وإدارة جميع أنشطة المدرسة (وليس أنشطته فقط)" },
  { code: PERMISSIONS.ACTIVITY_CREATE, module: "activity", description: "إنشاء نشاط مدرسي جديد" },
  { code: PERMISSIONS.ACTIVITY_UPDATE, module: "activity", description: "تعديل بيانات النشاط" },
  { code: PERMISSIONS.ACTIVITY_ARCHIVE, module: "activity", description: "أرشفة النشاط" },

  { code: PERMISSIONS.PARTICIPATION_VIEW, module: "participation", description: "عرض مشاركات الطلاب في الأنشطة" },
  { code: PERMISSIONS.PARTICIPATION_CREATE, module: "participation", description: "تسجيل مشاركات جماعية وفردية" },
  { code: PERMISSIONS.PARTICIPATION_UPDATE, module: "participation", description: "تعديل سجل مشاركة" },
  { code: PERMISSIONS.PARTICIPATION_REMOVE, module: "participation", description: "إلغاء أو حذف مشاركة" },

  { code: PERMISSIONS.REPORT_VIEW, module: "report", description: "عرض التقارير الرسمية والتفصيلية" },
  { code: PERMISSIONS.REPORT_EXPORT, module: "report", description: "تصدير التقارير إلى PDF و Excel" },
  { code: PERMISSIONS.STATISTICS_VIEW, module: "statistics", description: "عرض الإحصائيات الرسمية ونسب المشاركة" },

  { code: PERMISSIONS.ATTACHMENT_VIEW, module: "attachment", description: "عرض وتحميل مرفقات الأنشطة" },
  { code: PERMISSIONS.ATTACHMENT_UPLOAD, module: "attachment", description: "رفع مرفقات وصور الأنشطة" },
  { code: PERMISSIONS.ATTACHMENT_REMOVE, module: "attachment", description: "حذف أو أرشفة مرفقات النشاط" },

  { code: PERMISSIONS.ACADEMIC_YEAR_VIEW, module: "academic_year", description: "عرض الأعوام الدراسية" },
  { code: PERMISSIONS.ACADEMIC_YEAR_MANAGE, module: "academic_year", description: "إنشاء وإدارة وتحديد العام الدراسي الحالي" },

  { code: PERMISSIONS.CATEGORY_VIEW, module: "category", description: "عرض تصنيفات الأنشطة" },
  { code: PERMISSIONS.CATEGORY_MANAGE, module: "category", description: "إدارة وتعديل تصنيفات الأنشطة" },

  { code: PERMISSIONS.SCHOOL_SETTINGS_VIEW, module: "school_settings", description: "عرض إعدادات ومعلومات المدرسة" },
  { code: PERMISSIONS.SCHOOL_SETTINGS_MANAGE, module: "school_settings", description: "تعديل إعدادات وشعار ومعلومات المدرسة" },

  { code: PERMISSIONS.USER_VIEW, module: "user", description: "عرض قائمة المستخدمين" },
  { code: PERMISSIONS.USER_CREATE, module: "user", description: "إنشاء حساب مستخدم جديد" },
  { code: PERMISSIONS.USER_UPDATE, module: "user", description: "تعديل بيانات وأدوار وكلمات مرور المستخدمين" },
  { code: PERMISSIONS.USER_DEACTIVATE, module: "user", description: "تعطيل أو تنشيط حسابات المستخدمين" },
  { code: PERMISSIONS.USER_DELETE, module: "user", description: "حذف حسابات المستخدمين نهائياً" },

  { code: PERMISSIONS.ROLE_VIEW, module: "role", description: "عرض الأدوار ومصفوفة الصلاحيات" },
  { code: PERMISSIONS.ROLE_MANAGE, module: "role", description: "تعديل أذونات الأدوار" },

  { code: PERMISSIONS.AUDIT_VIEW, module: "audit", description: "عرض سجل العمليات والتدقيق الأمني" },

  { code: PERMISSIONS.BACKUP_CREATE, module: "backup", description: "إنشاء نسخة احتياطية من قاعدة البيانات" },
  { code: PERMISSIONS.BACKUP_RESTORE, module: "backup", description: "استعادة النظام من نسخة احتياطية" },
];

export const SYSTEM_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  SCHOOL_ADMIN: "SCHOOL_ADMIN",
  ACTIVITY_SUPERVISOR: "ACTIVITY_SUPERVISOR", // أخصائي الأنشطة
  TEACHER: "TEACHER",
  DATA_ENTRY: "DATA_ENTRY",
  REPORT_VIEWER: "REPORT_VIEWER",
} as const;

export type SystemRoleCode = typeof SYSTEM_ROLES[keyof typeof SYSTEM_ROLES];
