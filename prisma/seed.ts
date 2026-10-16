import { PrismaClient } from "@prisma/client";
import { ALL_PERMISSIONS, PERMISSIONS, SYSTEM_ROLES } from "../lib/auth/permissions";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // 1. Seed Permissions
  console.log("Seeding permissions...");
  for (const perm of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        description: perm.description,
        module: perm.module,
      },
      create: {
        code: perm.code,
        description: perm.description,
        module: perm.module,
      },
    });
  }
  const allDbPermissions = await prisma.permission.findMany();
  const permMap = new Map(allDbPermissions.map((p) => [p.code, p.id]));

  // 2. Seed System Roles
  console.log("Seeding system roles...");
  const rolesConfig: {
    code: string;
    name_ar: string;
    description: string;
    permissions: string[];
  }[] = [
    {
      code: SYSTEM_ROLES.SUPER_ADMIN,
      name_ar: "مدير النظام",
      description: "صلاحيات كاملة وغير مقيدة على كافة إعدادات ومستخدمي وبيانات النظام",
      permissions: ALL_PERMISSIONS.map((p) => p.code),
    },
    {
      code: SYSTEM_ROLES.SCHOOL_ADMIN,
      name_ar: "مدير المدرسة",
      description: "إدارة المدرسة ومتابعة الأنشطة والطلاب والتقارير وسجل العمليات",
      permissions: [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.STUDENT_VIEW,
        PERMISSIONS.STUDENT_CREATE,
        PERMISSIONS.STUDENT_UPDATE,
        PERMISSIONS.STUDENT_ARCHIVE,
        PERMISSIONS.STUDENT_EXPORT,
        PERMISSIONS.ENROLLMENT_VIEW,
        PERMISSIONS.ENROLLMENT_MANAGE,
        PERMISSIONS.ACTIVITY_VIEW,
        PERMISSIONS.ACTIVITY_CREATE,
        PERMISSIONS.ACTIVITY_UPDATE,
        PERMISSIONS.ACTIVITY_ARCHIVE,
        PERMISSIONS.PARTICIPATION_VIEW,
        PERMISSIONS.PARTICIPATION_CREATE,
        PERMISSIONS.PARTICIPATION_UPDATE,
        PERMISSIONS.PARTICIPATION_REMOVE,
        PERMISSIONS.REPORT_VIEW,
        PERMISSIONS.REPORT_EXPORT,
        PERMISSIONS.STATISTICS_VIEW,
        PERMISSIONS.ATTACHMENT_VIEW,
        PERMISSIONS.ATTACHMENT_UPLOAD,
        PERMISSIONS.ATTACHMENT_REMOVE,
        PERMISSIONS.ACADEMIC_YEAR_VIEW,
        PERMISSIONS.CATEGORY_VIEW,
        PERMISSIONS.SCHOOL_SETTINGS_VIEW,
        PERMISSIONS.USER_VIEW,
        PERMISSIONS.ROLE_VIEW,
        PERMISSIONS.AUDIT_VIEW,
      ],
    },
    {
      code: SYSTEM_ROLES.ACTIVITY_SUPERVISOR,
      name_ar: "أخصائي الأنشطة",
      description: "تخطيط وإدارة الأنشطة وتسجيل المشاركات والمرفقات وتوليد تقرير أخصائي الأنشطة",
      permissions: [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.STUDENT_VIEW,
        PERMISSIONS.STUDENT_UPDATE,
        PERMISSIONS.ENROLLMENT_VIEW,
        PERMISSIONS.ACTIVITY_VIEW,
        PERMISSIONS.ACTIVITY_CREATE,
        PERMISSIONS.ACTIVITY_UPDATE,
        PERMISSIONS.ACTIVITY_ARCHIVE,
        PERMISSIONS.PARTICIPATION_VIEW,
        PERMISSIONS.PARTICIPATION_CREATE,
        PERMISSIONS.PARTICIPATION_UPDATE,
        PERMISSIONS.PARTICIPATION_REMOVE,
        PERMISSIONS.REPORT_VIEW,
        PERMISSIONS.REPORT_EXPORT,
        PERMISSIONS.STATISTICS_VIEW,
        PERMISSIONS.ATTACHMENT_VIEW,
        PERMISSIONS.ATTACHMENT_UPLOAD,
        PERMISSIONS.ATTACHMENT_REMOVE,
        PERMISSIONS.ACADEMIC_YEAR_VIEW,
        PERMISSIONS.CATEGORY_VIEW,
      ],
    },
    {
      code: SYSTEM_ROLES.TEACHER,
      name_ar: "المعلم",
      description: "تنفيذ وتوثيق أنشطته وتسجيل مشاركات الطلاب وتصدير تقرير الأنشطة السنوي للمدرسة",
      permissions: [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.STUDENT_VIEW,
        PERMISSIONS.ENROLLMENT_VIEW,
        PERMISSIONS.ACTIVITY_VIEW,
        PERMISSIONS.ACTIVITY_CREATE,
        PERMISSIONS.ACTIVITY_UPDATE,
        PERMISSIONS.PARTICIPATION_VIEW,
        PERMISSIONS.PARTICIPATION_CREATE,
        PERMISSIONS.PARTICIPATION_UPDATE,
        PERMISSIONS.REPORT_VIEW,
        PERMISSIONS.REPORT_EXPORT,
        PERMISSIONS.ATTACHMENT_VIEW,
        PERMISSIONS.ATTACHMENT_UPLOAD,
        PERMISSIONS.CATEGORY_VIEW,
      ],
    },
    {
      code: SYSTEM_ROLES.DATA_ENTRY,
      name_ar: "مدخل البيانات",
      description: "إدخال وتحديث سجلات الطلاب والأنشطة وتسجيل المشاركات المسموح بها",
      permissions: [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.STUDENT_VIEW,
        PERMISSIONS.STUDENT_CREATE,
        PERMISSIONS.STUDENT_UPDATE,
        PERMISSIONS.ENROLLMENT_VIEW,
        PERMISSIONS.ACTIVITY_VIEW,
        PERMISSIONS.ACTIVITY_CREATE,
        PERMISSIONS.ACTIVITY_UPDATE,
        PERMISSIONS.PARTICIPATION_VIEW,
        PERMISSIONS.PARTICIPATION_CREATE,
        PERMISSIONS.PARTICIPATION_UPDATE,
        PERMISSIONS.ATTACHMENT_VIEW,
        PERMISSIONS.ATTACHMENT_UPLOAD,
      ],
    },
    {
      code: SYSTEM_ROLES.REPORT_VIEWER,
      name_ar: "قارئ التقارير",
      description: "استعراض الإحصائيات ولوحة التحكم والتقارير وتصديرها دون تعديل",
      permissions: [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.STUDENT_VIEW,
        PERMISSIONS.ACTIVITY_VIEW,
        PERMISSIONS.PARTICIPATION_VIEW,
        PERMISSIONS.REPORT_VIEW,
        PERMISSIONS.REPORT_EXPORT,
        PERMISSIONS.STATISTICS_VIEW,
        PERMISSIONS.ATTACHMENT_VIEW,
      ],
    },
  ];

  for (const roleConf of rolesConfig) {
    const role = await prisma.role.upsert({
      where: { code: roleConf.code },
      update: {
        name_ar: roleConf.name_ar,
        description: roleConf.description,
        is_system: true,
      },
      create: {
        code: roleConf.code,
        name_ar: roleConf.name_ar,
        description: roleConf.description,
        is_system: true,
      },
    });

    // Sync role permissions
    for (const permCode of roleConf.permissions) {
      const permId = permMap.get(permCode);
      if (permId) {
        await prisma.rolePermission.upsert({
          where: {
            role_id_permission_id: {
              role_id: role.id,
              permission_id: permId,
            },
          },
          update: {},
          create: {
            role_id: role.id,
            permission_id: permId,
          },
        });
      }
    }
  }

  // 3. Seed 9 Default Activity Categories
  console.log("Seeding activity categories...");
  const categories = [
    { code: "APPROVED_PLAN", name_ar: "خطة معتمدة", sort_order: 1 },
    { code: "LOCAL_GLOBAL_EVENTS", name_ar: "مناسبات محلية وعالمية", sort_order: 2 },
    { code: "VISION_MISSION", name_ar: "تفعيل رؤية ورسالة", sort_order: 3 },
    { code: "NATIONAL_IDENTITY", name_ar: "الهوية الوطنية", sort_order: 4 },
    { code: "EDUCATIONAL_VALUES", name_ar: "قيم تربوية", sort_order: 5 },
    { code: "CIRCULARS_ACTIVITIES", name_ar: "أنشطة تعاميم واردة من إدارة شؤون المدارس", sort_order: 6 },
    { code: "DEPARTMENT_PLANS", name_ar: "أنشطة خطط الأقسام", sort_order: 7 },
    { code: "OTHER", name_ar: "أخرى", sort_order: 8 },
    { code: "SUSTAINABILITY", name_ar: "أنشطة الاستدامة", sort_order: 9 },
  ];

  for (const cat of categories) {
    await prisma.activityCategory.upsert({
      where: { code: cat.code },
      update: {
        name_ar: cat.name_ar,
        sort_order: cat.sort_order,
        is_active: true,
      },
      create: {
        code: cat.code,
        name_ar: cat.name_ar,
        sort_order: cat.sort_order,
        is_active: true,
      },
    });
  }

  // 4. Seed Standard Grade Levels (10, 11, 12)
  console.log("Seeding grade levels...");
  const grades = [
    { name_ar: "الصف العاشر", name_en: "Grade 10", sort_order: 1 },
    { name_ar: "الصف الحادي عشر", name_en: "Grade 11", sort_order: 2 },
    { name_ar: "الصف الثاني عشر", name_en: "Grade 12", sort_order: 3 },
  ];

  for (const grade of grades) {
    const existing = await prisma.gradeLevel.findFirst({
      where: { name_ar: grade.name_ar },
    });
    if (!existing) {
      await prisma.gradeLevel.create({
        data: grade,
      });
    }
  }

  // 5. Seed Standard Sections (1 - 10)
  console.log("Seeding sections...");
  for (let i = 1; i <= 10; i++) {
    const secName = `${i}`;
    await prisma.section.upsert({
      where: { name: secName },
      update: { sort_order: i },
      create: {
        name: secName,
        sort_order: i,
        is_active: true,
      },
    });
  }

  console.log("✅ Database seed completed successfully! (No mock student or activity data inserted).");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
