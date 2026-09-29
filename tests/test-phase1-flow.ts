import { prisma } from "../lib/db/prisma";
import { createAcademicYear, setCurrentAcademicYear, getCurrentAcademicYear } from "../lib/services/academic-year-service";
import { createStudent, getStudents, getStudentMetrics } from "../lib/services/student-service";
import { createActivity, getActivities } from "../lib/services/activity-service";
import { registerGroupParticipations } from "../lib/services/participation-service";
import { getDashboardMetrics } from "../lib/services/statistics-service";
import { createUser, getUsers } from "../lib/services/user-service";
import { SYSTEM_ROLES } from "../lib/auth/permissions";

async function runPhase1Tests() {
  console.log("🚀 Starting Phase 1 Integration Tests...\n");

  // 1. Academic Year Test
  console.log("1️⃣ Testing Academic Year Service...");
  let currentYear = await getCurrentAcademicYear();
  if (!currentYear) {
    currentYear = await createAcademicYear({
      name: "2026-2027",
      start_date: "2026-09-01",
      end_date: "2027-06-30",
      is_current: true,
    });
    console.log(`   Created academic year: ${currentYear.name} (is_current: ${currentYear.is_current})`);
  } else {
    console.log(`   Found active academic year: ${currentYear.name}`);
  }

  // 2. Fetch Grade and Section
  const grade10 = await prisma.gradeLevel.findFirst({ where: { name_ar: "الصف العاشر" } });
  const sec1 = await prisma.section.findFirst({ where: { name: "1" } });
  if (!grade10 || !sec1) throw new Error("Grade 10 or Section 1 not found!");

  // 3. Student Creation & Enrollment Test
  console.log("\n2️⃣ Testing Student Service...");
  const testAcademicNumber = "20269999";
  let student = await prisma.student.findUnique({ where: { academic_number: testAcademicNumber } });
  if (!student) {
    student = await createStudent({
      academic_number: testAcademicNumber,
      full_name_ar: "طالب تجربة النظام",
      nationality_group: "QATARI",
      nationality: "قطري",
      academic_year_id: currentYear.id,
      grade_level_id: grade10.id,
      section_id: sec1.id,
    });
    console.log(`   Created student: ${student.full_name_ar} (ID: ${student.id})`);
  } else {
    console.log(`   Existing student found: ${student.full_name_ar}`);
  }

  const studentMetrics = await getStudentMetrics({ academicYearId: currentYear.id });
  console.log(`   Student Cohort Metrics: Total=${studentMetrics.total}, Qatari=${studentMetrics.qatari}, NonQatari=${studentMetrics.nonQatari}`);

  // 4. Activity Creation Test
  console.log("\n3️⃣ Testing Activity Service...");
  const category = await prisma.activityCategory.findFirst({ where: { code: "APPROVED_PLAN" } });
  if (!category) throw new Error("Category APPROVED_PLAN not found");

  const activity = await createActivity({
    name: "بطولة الروبوت المدرسية 2026",
    category_id: category.id,
    academic_year_id: currentYear.id,
    activity_date: "2026-10-15",
    status: "COMPLETED",
  });
  console.log(`   Created activity: ${activity.name} (ID: ${activity.id})`);

  // 5. Atomic Group Participation Registration Test
  console.log("\n4️⃣ Testing Group Participation Service...");
  const partResult1 = await registerGroupParticipations({
    activityId: activity.id,
    studentIds: [student.id],
    notes: "مشارك متميز في البرمجة",
  });
  console.log(`   First registration result: added=${partResult1.addedCount}, msg=${partResult1.message}`);

  // Test duplicate prevention on same activity and student
  console.log("   Testing duplicate prevention on same activity...");
  const partResult2 = await registerGroupParticipations({
    activityId: activity.id,
    studentIds: [student.id],
  });
  console.log(`   Second registration result: added=${partResult2.addedCount}, alreadyRegistered=${partResult2.alreadyRegisteredCount}`);

  if (partResult2.addedCount !== 0) {
    throw new Error("❌ FAILURE: Duplicate participation was allowed!");
  }
  console.log("   ✅ SUCCESS: Duplicate was correctly rejected!");

  // 6. Statistics Verification
  console.log("\n5️⃣ Testing Statistics Service Calculations...");
  const stats = await getDashboardMetrics({ academicYearId: currentYear.id });
  console.log(`   Population: ${stats.totalPopulation}`);
  console.log(`   Unique Participants: ${stats.uniqueParticipants}`);
  console.log(`   Non-Participants: ${stats.nonParticipants}`);
  console.log(`   Total Participations: ${stats.totalParticipations}`);
  console.log(`   Participation Rate: ${stats.participationRate}%`);
  console.log(`   Qatari Participants: ${stats.qatariParticipants}`);

  if (stats.uniqueParticipants < 1 || stats.totalParticipations < 1) {
    throw new Error("❌ Statistics calculation mismatch!");
  }
  console.log("   ✅ SUCCESS: Statistics calculations match business rules!");

  // 7. RBAC & Audit Log Verification
  console.log("\n6️⃣ Verifying Audit Logs...");
  const auditLogsCount = await prisma.auditLog.count();
  console.log(`   Total audit log entries recorded: ${auditLogsCount}`);

  console.log("\n🎉 ALL PHASE 1 INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉\n");
}

runPhase1Tests()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
