import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🏫 Setting up initial academic year, school settings, and class groups...");

  // 1. Current Academic Year
  const yearName = "2026-2027";
  let academicYear = await prisma.academicYear.findUnique({
    where: { name: yearName },
  });

  if (!academicYear) {
    academicYear = await prisma.academicYear.create({
      data: {
        name: yearName,
        start_date: new Date("2026-09-01"),
        end_date: new Date("2027-06-30"),
        term1_start_date: new Date("2026-09-01"),
        term1_end_date: new Date("2027-01-15"),
        term2_start_date: new Date("2027-01-20"),
        term2_end_date: new Date("2027-06-30"),
        is_current: true,
      },
    });
    console.log(`✅ Created academic year: ${academicYear.name}`);
  }

  // 2. School Settings
  let schoolSettings = await prisma.schoolSettings.findFirst();
  if (!schoolSettings) {
    schoolSettings = await prisma.schoolSettings.create({
      data: {
        school_name_ar: "مدرسة عبد الله بن علي المسند الثانوية للبنين",
        school_name_en: "Abdullah Bin Ali Almesnad Secondary School For Boys",
        supervisor_name: "مشرف الأنشطة المدرسية",
        current_academic_year_id: academicYear.id,
      },
    });
    console.log(`✅ Created school settings`);
  } else if (!schoolSettings.current_academic_year_id) {
    await prisma.schoolSettings.update({
      where: { id: schoolSettings.id },
      data: { current_academic_year_id: academicYear.id },
    });
    console.log(`✅ Linked school settings with current academic year`);
  }

  // 3. Class Groups (Grades x Sections)
  const grades = await prisma.gradeLevel.findMany({ orderBy: { sort_order: "asc" } });
  const sections = await prisma.section.findMany({ orderBy: { sort_order: "asc" } });

  let createdClassGroups = 0;
  for (const grade of grades) {
    for (const section of sections) {
      const displayName = `${grade.name_ar} - الشعبة ${section.name}`;
      const existing = await prisma.classGroup.findUnique({
        where: {
          academic_year_id_grade_level_id_section_id: {
            academic_year_id: academicYear.id,
            grade_level_id: grade.id,
            section_id: section.id,
          },
        },
      });

      if (!existing) {
        await prisma.classGroup.create({
          data: {
            academic_year_id: academicYear.id,
            grade_level_id: grade.id,
            section_id: section.id,
            display_name: displayName,
            is_active: true,
          },
        });
        createdClassGroups++;
      }
    }
  }
  console.log(`✅ Ensured ${createdClassGroups} class groups created for ${academicYear.name}`);

  // 4. Inspirational Quotes
  const quotesCount = await prisma.inspirationalQuote.count();
  if (quotesCount === 0) {
    await prisma.inspirationalQuote.createMany({
      data: [
        {
          quote_text: "الأنشطة تصنع الفرق في الطلاب وتبني مهارات المستقبل",
          author_title: "مدرسة عبد الله بن علي المسند الثانوية للبنين",
          sub_title: "نظام إدارة الأنشطة والفعاليات",
          image_url: "/back.jpg",
          display_order: 1,
          is_active: true,
        },
        {
          quote_text: "النشاط الطلابي ركيزة أساسية لبناء الشخصية المتوازنة واكتشاف المواهب الواعدة",
          author_title: "وزارة التربية والتعليم والتعليم العالي",
          sub_title: "دولة قطر — رعاية الموهبة والإبداع",
          image_url: "/back.jpg",
          display_order: 2,
          is_active: true,
        },
        {
          quote_text: "بناء الإنسان والاستثمار في قدرات الطلاب هما أساس التنمية ورؤية قطر الوطنية 2030",
          author_title: "مدرسة عبد الله بن علي المسند الثانوية للبنين",
          sub_title: "رؤية وطنية طموحة لإعداد قادة الغد",
          image_url: "/back.jpg",
          display_order: 3,
          is_active: true,
        },
      ],
    });
    console.log(`✅ Seeded inspirational quotes`);
  }

  console.log("🎉 All initial data is completely set up and ready!");
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
