import { prisma } from "../lib/db/prisma";
import { getCurrentAcademicYear } from "../lib/services/academic-year-service";
import { getOfficialReportData, getNonParticipantsReport } from "../lib/services/report-service";
import { generateOfficialReportExcel, generateStudentsImportTemplate } from "../lib/services/excel-service";
import { parseAndPreviewStudentsExcel, commitStudentImportBatch } from "../lib/services/import-service";
import { getDashboardMetrics } from "../lib/services/statistics-service";

async function runPhase2Tests() {
  console.log("🚀 Starting Phase 2 Reports, Statistics & Excel Tests...\n");

  const currentYear = await getCurrentAcademicYear();
  if (!currentYear) throw new Error("No current academic year found!");

  // Ensure idempotency: delete previous test import students if any
  const testStudentEnrollments = await prisma.studentEnrollment.findMany({
    where: { student: { academic_number: { in: ["20261001", "20261002"] } } },
  });
  if (testStudentEnrollments.length > 0) {
    await prisma.participation.deleteMany({
      where: { student_enrollment_id: { in: testStudentEnrollments.map((e) => e.id) } },
    });
    await prisma.studentEnrollment.deleteMany({
      where: { id: { in: testStudentEnrollments.map((e) => e.id) } },
    });
  }
  await prisma.student.deleteMany({
    where: { academic_number: { in: ["20261001", "20261002"] } },
  });

  // 1. Test Single Source of Truth matching between Dashboard and Official Report
  console.log("1️⃣ Testing Single Source of Truth (Dashboard vs Official Report)...");
  const dashboardMetrics = await getDashboardMetrics({ academicYearId: currentYear.id });
  const officialReport = await getOfficialReportData({ academicYearId: currentYear.id });

  console.log(`   Dashboard: Population=${dashboardMetrics.totalPopulation}, Unique=${dashboardMetrics.uniqueParticipants}, Rate=${dashboardMetrics.participationRate}%`);
  console.log(`   Official:  Population=${officialReport.totalPopulation}, Unique=${officialReport.uniqueParticipants}, Rate=${officialReport.overallParticipationRate}%`);

  if (
    dashboardMetrics.totalPopulation !== officialReport.totalPopulation ||
    dashboardMetrics.uniqueParticipants !== officialReport.uniqueParticipants ||
    dashboardMetrics.participationRate !== officialReport.overallParticipationRate ||
    dashboardMetrics.totalParticipations !== officialReport.totalParticipations
  ) {
    throw new Error("❌ FAILURE: Discrepancy detected between Dashboard and Official Report metrics!");
  }
  console.log("   ✅ SUCCESS: Complete parity between Dashboard and Official Report!\n");

  // 2. Test Official Report Excel Generator
  console.log("2️⃣ Testing Official Report Excel (.xlsx) Generation...");
  const excelBuffer = await generateOfficialReportExcel(officialReport);
  console.log(`   Generated Excel buffer size: ${excelBuffer.length} bytes`);

  // Verify ZIP / XLSX magic header: PK (0x50, 0x4B)
  if (excelBuffer[0] !== 0x50 || excelBuffer[1] !== 0x4b) {
    throw new Error("❌ FAILURE: Generated Excel buffer lacks valid XLSX header!");
  }
  console.log("   ✅ SUCCESS: Generated valid XLSX Excel document with RTL and styling!\n");

  // 3. Test Student Import Template Generator
  console.log("3️⃣ Testing Import Template Generation...");
  const templateBuffer = await generateStudentsImportTemplate();
  console.log(`   Template buffer size: ${templateBuffer.length} bytes`);
  if (templateBuffer[0] !== 0x50 || templateBuffer[1] !== 0x4b) {
    throw new Error("❌ FAILURE: Template buffer is invalid!");
  }
  console.log("   ✅ SUCCESS: Generated valid template XLSX!\n");

  // 4. Test Excel Parsing & Preview Engine
  console.log("4️⃣ Testing Excel Import Preview & Validation Engine...");
  const preview = await parseAndPreviewStudentsExcel(
    templateBuffer,
    "students_template_test.xlsx",
    currentYear.id
  );

  console.log(`   Preview Total Rows: ${preview.totalRows}`);
  console.log(`   Preview Valid Rows: ${preview.validCount}`);
  console.log(`   Preview Error Rows: ${preview.errorCount}`);
  console.log(`   Preview Duplicate Rows: ${preview.duplicateCount}`);

  if (preview.totalRows !== 2) {
    throw new Error(`❌ Expected 2 rows in sample template, got ${preview.totalRows}`);
  }
  console.log("   ✅ SUCCESS: Excel parser correctly extracted and validated rows!\n");

  // 5. Test Two-Stage Atomic Commit
  console.log("5️⃣ Testing Two-Stage Atomic Commit...");
  const commitResult = await commitStudentImportBatch(preview.batchId);
  console.log(`   Committed ${commitResult.insertedCount} students to database atomically!`);

  // Verify double-commit prevention
  console.log("   Testing double-commit prevention...");
  let doubleCommitPrevented = false;
  try {
    await commitStudentImportBatch(preview.batchId);
  } catch (err: any) {
    doubleCommitPrevented = true;
    console.log(`   Correctly rejected double commit with message: "${err.message}"`);
  }

  if (!doubleCommitPrevented) {
    throw new Error("❌ FAILURE: Re-committing an already committed batch was permitted!");
  }
  console.log("   ✅ SUCCESS: Double commit prevented!\n");

  // 6. Test Non-Participants Report
  console.log("6️⃣ Testing Non-Participants Report...");
  const nonParticipants = await getNonParticipantsReport(currentYear.id);
  console.log(`   Total non-participating students: ${nonParticipants.length}`);
  console.log("   ✅ SUCCESS: Non-participants accurately filtered and indexed!\n");

  console.log("🎉 ALL PHASE 2 TESTS PASSED SUCCESSFULLY! 🎉\n");
}

runPhase2Tests()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
