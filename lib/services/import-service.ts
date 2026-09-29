import ExcelJS from "exceljs";
import { prisma } from "../db/prisma";
import { logAudit } from "../audit/audit-service";

export interface StudentRowPreview {
  rowNumber: number;
  academicNumber: string;
  fullNameAr: string;
  fullNameEn?: string;
  nationality?: string;
  nationalityGroup: "QATARI" | "NON_QATARI";
  gradeName?: string;
  sectionName?: string;
  notes?: string;
  isValid: boolean;
  errors: string[];
}

export interface ImportPreviewResult {
  batchId: string;
  filename: string;
  totalRows: number;
  validCount: number;
  errorCount: number;
  duplicateCount: number;
  rows: StudentRowPreview[];
}

export async function parseAndPreviewStudentsExcel(
  buffer: Buffer,
  filename: string,
  academicYearId: string,
  actorUserId?: string
): Promise<ImportPreviewResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error("ملف الإكسل فارغ أو لا يحتوي على أوراق عمل.");
  }

  // Fetch existing academic numbers in database
  const existingStudents = await prisma.student.findMany({
    select: { academic_number: true },
  });
  const existingAcademicNumbers = new Set(
    existingStudents.map((s) => s.academic_number?.toLowerCase().trim()).filter(Boolean)
  );

  const rows: StudentRowPreview[] = [];
  const seenInFile = new Set<string>();

  // 1. Dynamically detect header row and column mapping
  let headerRowIndex = -1;
  let academicCol = -1;
  let fullNameArCol = -1;
  let fullNameEnCol = -1;
  let nationalityCol = -1;
  let gradeCol = -1;
  let sectionCol = -1;
  let notesCol = -1;

  for (let r = 1; r <= Math.min(5, sheet.rowCount); r++) {
    const row = sheet.getRow(r);
    let matched = 0;
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const text = cell.text?.trim().toLowerCase();
      if (!text) return;
      if (text.includes("أكاديمي") || text.includes("اكاديمي") || text.includes("academic") || text.includes("رقم الطالب") || text.includes("الرقم")) {
        academicCol = colNumber;
        matched++;
      } else if (text.includes("اسم") || text.includes("طالب") || text.includes("name")) {
        if (text.includes("إنجليزي") || text.includes("انجليزي") || text.includes("en")) {
          fullNameEnCol = colNumber;
        } else {
          fullNameArCol = colNumber;
        }
        matched++;
      } else if (text.includes("جنسية") || text.includes("nationality") || text.includes("دولة")) {
        nationalityCol = colNumber;
        matched++;
      } else if (text.includes("شعبة") || text.includes("شعبة") || text.includes("section")) {
        sectionCol = colNumber;
        matched++;
      } else if (text.includes("صف") || text.includes("مستوى") || text.includes("grade")) {
        gradeCol = colNumber;
        matched++;
      } else if (text.includes("ملاحظات") || text.includes("notes")) {
        notesCol = colNumber;
      }
    });

    if (matched >= 2) {
      headerRowIndex = r;
      break;
    }
  }

  // Fallback defaults if header row was not cleanly matched
  if (headerRowIndex === -1) {
    headerRowIndex = 1;
    academicCol = 1;
    fullNameArCol = 2;
    nationalityCol = 3;
    sectionCol = 4;
    gradeCol = 5;
  }

  const startDataRow = headerRowIndex + 1;

  let validCount = 0;
  let errorCount = 0;
  let duplicateCount = 0;

  for (let r = startDataRow; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);

    const academicNumberRaw = academicCol > 0 ? row.getCell(academicCol).text?.trim() : "";
    const fullNameArRaw = fullNameArCol > 0 ? row.getCell(fullNameArCol).text?.trim() : "";
    const fullNameEnRaw = fullNameEnCol > 0 ? row.getCell(fullNameEnCol).text?.trim() || undefined : undefined;
    const nationalityRaw = nationalityCol > 0 ? row.getCell(nationalityCol).text?.trim() || "" : "";
    const sectionNameRaw = sectionCol > 0 ? row.getCell(sectionCol).text?.trim() || undefined : undefined;
    const gradeNameRaw = gradeCol > 0 ? row.getCell(gradeCol).text?.trim() || undefined : undefined;
    const notesRaw = notesCol > 0 ? row.getCell(notesCol).text?.trim() || undefined : undefined;

    // Skip empty rows
    if (!academicNumberRaw && !fullNameArRaw) continue;

    const errors: string[] = [];

    if (!academicNumberRaw) {
      errors.push("الرقم الأكاديمي مفقود");
    } else {
      const lowerAc = academicNumberRaw.toLowerCase();
      if (existingAcademicNumbers.has(lowerAc)) {
        errors.push("الرقم الأكاديمي مسجل بالفعل في النظام");
        duplicateCount++;
      }
      if (seenInFile.has(lowerAc)) {
        errors.push("الرقم الأكاديمي مكرر داخل نفس الملف");
        duplicateCount++;
      }
      seenInFile.add(lowerAc);
    }

    if (!fullNameArRaw || fullNameArRaw.length < 3) {
      errors.push("اسم الطالب بالعربية إلزامي ويجب أن يكون 3 أحرف على الأقل");
    }

    const isQatari =
      (nationalityRaw.includes("قطر") || nationalityRaw.includes("قطري")) &&
      !nationalityRaw.includes("سكان");

    const nationalityGroup: "QATARI" | "NON_QATARI" = isQatari ? "QATARI" : "NON_QATARI";
    const nationality = isQatari ? "قطري" : nationalityRaw || "غير قطري";

    const isValid = errors.length === 0;
    if (isValid) {
      validCount++;
    } else {
      errorCount++;
    }

    rows.push({
      rowNumber: r,
      academicNumber: academicNumberRaw || "",
      fullNameAr: fullNameArRaw || "",
      fullNameEn: fullNameEnRaw,
      nationality,
      nationalityGroup,
      gradeName: gradeNameRaw,
      sectionName: sectionNameRaw,
      notes: notesRaw,
      isValid,
      errors,
    });
  }

  // Create ImportBatch with status PREVIEWED
  const batch = await prisma.importBatch.create({
    data: {
      kind: "STUDENTS",
      filename,
      uploaded_by_id: actorUserId || null,
      status: "PREVIEWED",
      counts_json: JSON.stringify({
        total: rows.length,
        valid: validCount,
        errors: errorCount,
        duplicates: duplicateCount,
        academicYearId,
        rows,
      }),
    },
  });

  return {
    batchId: batch.id,
    filename,
    totalRows: rows.length,
    validCount,
    errorCount,
    duplicateCount,
    rows,
  };
}

export async function commitStudentImportBatch(
  batchId: string,
  actorUserId?: string
) {
  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId },
  });

  if (!batch) {
    throw new Error("دفعة الاستيراد غير موجودة.");
  }

  if (batch.status === "COMMITTED") {
    throw new Error("تم اعتماد هذه الدفعة مسبقاً ولا يمكن تكرار اعتمادها.");
  }

  const payload = JSON.parse(batch.counts_json || "{}");
  const rows: StudentRowPreview[] = payload.rows || [];
  const academicYearId: string = payload.academicYearId;

  const validRows = rows.filter((r) => r.isValid);
  if (validRows.length === 0) {
    throw new Error("لا توجد سجلات صالحة للاعتماد في هذه الدفعة.");
  }

  // Pre-load grade levels and sections
  const grades = await prisma.gradeLevel.findMany();
  const sections = await prisma.section.findMany();

  const gradeMap = new Map(grades.map((g) => [g.name_ar.trim(), g.id]));
  const sectionMap = new Map(sections.map((s) => [s.name.trim(), s.id]));

  // Default grade/section if not specified in file
  const defaultGradeId = grades[0]?.id;
  const defaultSectionId = sections[0]?.id;

  const result = await prisma.$transaction(async (tx) => {
    let insertedCount = 0;

    for (const r of validRows) {
      // Create student
      const student = await tx.student.create({
        data: {
          academic_number: r.academicNumber,
          full_name_ar: r.fullNameAr,
          full_name_en: r.fullNameEn || null,
          nationality: r.nationality || (r.nationalityGroup === "QATARI" ? "قطري" : null),
          nationality_group: r.nationalityGroup,
          notes: r.notes || null,
          is_active: true,
        },
      });

      // Find or match grade
      let targetGradeId = defaultGradeId;
      if (r.gradeName) {
        for (const [name, id] of gradeMap.entries()) {
          if (r.gradeName.includes(name) || name.includes(r.gradeName)) {
            targetGradeId = id;
            break;
          }
        }
      }

      // Find or match section (clean numbers e.g. "شعبة 2" -> "2")
      let targetSectionId = defaultSectionId;
      if (r.sectionName) {
        const cleanSec = r.sectionName.replace(/[^\d]/g, "").trim() || r.sectionName.trim();
        for (const [name, id] of sectionMap.entries()) {
          const cleanMapName = name.replace(/[^\d]/g, "").trim() || name.trim();
          if (cleanSec === cleanMapName || r.sectionName.includes(name) || name.includes(r.sectionName)) {
            targetSectionId = id;
            break;
          }
        }

        // Auto-create section if it doesn't exist
        if (!targetSectionId && cleanSec) {
          const secNum = parseInt(cleanSec, 10) || 1;
          const newSection = await tx.section.upsert({
            where: { name: cleanSec },
            update: {},
            create: { name: cleanSec, sort_order: secNum, is_active: true },
          });
          targetSectionId = newSection.id;
          sectionMap.set(cleanSec, newSection.id);
        }
      }

      if (academicYearId && targetGradeId && targetSectionId) {
        // Find or create class group
        let classGroup = await tx.classGroup.findUnique({
          where: {
            academic_year_id_grade_level_id_section_id: {
              academic_year_id: academicYearId,
              grade_level_id: targetGradeId,
              section_id: targetSectionId,
            },
          },
        });

        if (!classGroup) {
          const g = grades.find((x) => x.id === targetGradeId);
          const s = sections.find((x) => x.id === targetSectionId);
          classGroup = await tx.classGroup.create({
            data: {
              academic_year_id: academicYearId,
              grade_level_id: targetGradeId,
              section_id: targetSectionId,
              display_name: `${g?.name_ar || "الصف"} / ${s?.name || r.sectionName || "الشعبة"}`,
            },
          });
        }

        // Enroll
        await tx.studentEnrollment.create({
          data: {
            student_id: student.id,
            class_group_id: classGroup.id,
            academic_year_id: academicYearId,
            status: "ACTIVE",
            enrolled_from: new Date(),
          },
        });
      }

      insertedCount++;
    }

    // Update batch to COMMITTED
    await tx.importBatch.update({
      where: { id: batchId },
      data: {
        status: "COMMITTED",
        committed_at: new Date(),
      },
    });

    return insertedCount;
  });

  await logAudit({
    actorUserId,
    action: "COMMIT_IMPORT",
    entityType: "import_batch",
    entityId: batchId,
    afterData: { insertedStudentsCount: result },
  });

  return { insertedCount: result };
}
