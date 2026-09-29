import ExcelJS from "exceljs";
import { OfficialReportData } from "./report-service";

export async function generateOfficialReportExcel(data: OfficialReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "نظام إدارة الأنشطة الطلابية";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("التقرير الإحصائي الرسمي", {
    views: [{ rightToLeft: true }],
  });

  // 1. School Title
  sheet.mergeCells("A1:H1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = data.schoolName;
  titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FF8A1538" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 30;

  // 2. Subtitle
  sheet.mergeCells("A2:H2");
  const subCell = sheet.getCell("A2");
  const periodText = data.periodLabel ? ` (${data.periodLabel})` : "";
  subCell.value = `التقرير الإحصائي الرسمي للأنشطة المدرسية — العام الدراسي: ${data.academicYearName}${periodText}`;
  subCell.font = { name: "Arial", size: 12, bold: true, color: { argb: "FF333333" } };
  subCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(2).height = 24;

  // 3. Metadata
  sheet.mergeCells("A3:H3");
  const metaCell = sheet.getCell("A3");
  metaCell.value = `تاريخ الاستخراج: ${data.generatedAt} | إجمالي طلاب المدرسة: ${data.totalPopulation} | المشاركون الفريدون: ${data.uniqueParticipants} | النسبة العامة: ${data.overallParticipationRate}%`;
  metaCell.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF666666" } };
  metaCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(3).height = 20;

  sheet.addRow([]); // Blank row

  // 4. Table Headers
  const headerRow = sheet.addRow([
    "م",
    "تصنيف النشاط المدرسي",
    "عدد الأنشطة",
    "مشاركات القطريين",
    "مشاركات غير القطريين",
    "إجمالي المشاركات",
    "الطلاب الفريدون",
    "نسبة المشاركة %",
  ]);

  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF8A1538" }, // Qatar Maroon
    };
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCCCCCC" } },
      bottom: { style: "medium", color: { argb: "FFFFFFFF" } },
      left: { style: "thin", color: { argb: "FFCCCCCC" } },
      right: { style: "thin", color: { argb: "FFCCCCCC" } },
    };
  });

  // 5. Data Rows
  data.rows.forEach((row, idx) => {
    const r = sheet.addRow([
      idx + 1,
      row.categoryName,
      row.activitiesCount,
      row.qatariParticipations,
      row.nonQatariParticipations,
      row.totalParticipations,
      row.uniqueParticipants,
      `${row.participationRate}%`,
    ]);

    r.height = 22;
    r.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 10 };
      cell.alignment = {
        horizontal: colNumber === 2 ? "right" : "center",
        vertical: "middle",
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE0E0E0" } },
        bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
        left: { style: "thin", color: { argb: "FFE0E0E0" } },
        right: { style: "thin", color: { argb: "FFE0E0E0" } },
      };
      if (idx % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF9FBFD" },
        };
      }
    });
  });

  // 6. Summary Totals Row
  const totalRow = sheet.addRow([
    "المجموع",
    "المجموع العام لجميع الأنشطة",
    data.totalActivities,
    data.qatariParticipants,
    data.nonQatariParticipants,
    data.totalParticipations,
    data.uniqueParticipants,
    `${data.overallParticipationRate}%`,
  ]);

  totalRow.height = 28;
  totalRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF0F4F8" },
    };
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF111111" } };
    cell.alignment = {
      horizontal: colNumber === 2 ? "right" : "center",
      vertical: "middle",
    };
    cell.border = {
      top: { style: "medium", color: { argb: "FF8A1538" } },
      bottom: { style: "double", color: { argb: "FF8A1538" } },
      left: { style: "thin", color: { argb: "FFCCCCCC" } },
      right: { style: "thin", color: { argb: "FFCCCCCC" } },
    };
  });

  // Set Column Widths
  sheet.getColumn(1).width = 8;
  sheet.getColumn(2).width = 42;
  sheet.getColumn(3).width = 16;
  sheet.getColumn(4).width = 20;
  sheet.getColumn(5).width = 22;
  sheet.getColumn(6).width = 20;
  sheet.getColumn(7).width = 18;
  sheet.getColumn(8).width = 18;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function generateStudentsImportTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "نظام إدارة الأنشطة الطلابية";

  const sheet = workbook.addWorksheet("قالب استيراد الطلاب", {
    views: [{ rightToLeft: true }],
  });

  const headerRow = sheet.addRow([
    "الرقم الأكاديمي",
    "اسم الطالب",
    "الجنسية",
    "الشعبة",
    "الصف",
    "ملاحظات",
  ]);

  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF8A1538" },
    };
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  // Sample Data Rows
  sheet.addRow([
    "20261001",
    "علي راشد المري",
    "قطر",
    "1",
    "الصف العاشر",
    "",
  ]);

  sheet.addRow([
    "20261002",
    "خالد محمود الأحمد",
    "مصر",
    "2",
    "الصف العاشر",
    "",
  ]);

  sheet.getColumn(1).width = 20;
  sheet.getColumn(2).width = 34;
  sheet.getColumn(3).width = 18;
  sheet.getColumn(4).width = 14;
  sheet.getColumn(5).width = 22;
  sheet.getColumn(6).width = 24;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export interface NonParticipantExcelItem {
  serial?: number;
  academicNumber: string;
  fullName: string;
  nationality: string;
  gradeName: string;
  sectionName: string;
}

export async function generateNonParticipantsExcel(
  items: NonParticipantExcelItem[],
  schoolName: string,
  academicYearName: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "نظام إدارة الأنشطة الطلابية";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("الطلاب غير المشاركين", {
    views: [{ rightToLeft: true }],
  });

  // Title
  sheet.mergeCells("A1:F1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = schoolName;
  titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FF8A1538" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 30;

  // Subtitle
  sheet.mergeCells("A2:F2");
  const subCell = sheet.getCell("A2");
  subCell.value = `تقرير الطلاب غير المشاركين في الأنشطة المدرسية — العام الدراسي: ${academicYearName}`;
  subCell.font = { name: "Arial", size: 12, bold: true, color: { argb: "FF333333" } };
  subCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(2).height = 24;

  // Metadata
  sheet.mergeCells("A3:F3");
  const metaCell = sheet.getCell("A3");
  metaCell.value = `تاريخ الاستخراج: ${new Date().toLocaleString("ar-QA")} | إجمالي الطلاب غير المشاركين: ${items.length} طالب`;
  metaCell.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF666666" } };
  metaCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(3).height = 20;

  sheet.addRow([]);

  // Headers
  const headerRow = sheet.addRow([
    "م",
    "الرقم الأكاديمي",
    "اسم الطالب الكامل",
    "الجنسية",
    "الصف الدراسي",
    "الشعبة",
  ]);

  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF8A1538" },
    };
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  items.forEach((item, idx) => {
    const r = sheet.addRow([
      item.serial || idx + 1,
      item.academicNumber,
      item.fullName,
      item.nationality,
      item.gradeName,
      `شعبة ${item.sectionName}`,
    ]);
    r.height = 22;
    r.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 10 };
      cell.alignment = {
        horizontal: colNumber === 3 ? "right" : "center",
        vertical: "middle",
      };
      if (idx % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF9FBFD" },
        };
      }
    });
  });

  sheet.getColumn(1).width = 8;
  sheet.getColumn(2).width = 20;
  sheet.getColumn(3).width = 38;
  sheet.getColumn(4).width = 16;
  sheet.getColumn(5).width = 22;
  sheet.getColumn(6).width = 16;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export interface ActivityExcelItem {
  activityDate: string;
  name: string;
  categoryName: string;
  totalParticipants: number;
  qatariCount: number;
  nonQatariCount: number;
  status: string;
}

export async function generateActivitiesExcel(
  items: ActivityExcelItem[],
  schoolName: string,
  academicYearName: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "نظام إدارة الأنشطة الطلابية";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("الأنشطة المدرسية المنفذة", {
    views: [{ rightToLeft: true }],
  });

  // Title
  sheet.mergeCells("A1:H1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = schoolName;
  titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FF8A1538" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 30;

  // Subtitle
  sheet.mergeCells("A2:H2");
  const subCell = sheet.getCell("A2");
  subCell.value = `تقرير الأنشطة والفعاليات المدرسية المنفذة — العام الدراسي: ${academicYearName}`;
  subCell.font = { name: "Arial", size: 12, bold: true, color: { argb: "FF333333" } };
  subCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(2).height = 24;

  // Metadata
  sheet.mergeCells("A3:H3");
  const metaCell = sheet.getCell("A3");
  metaCell.value = `تاريخ الاستخراج: ${new Date().toLocaleString("ar-QA")} | إجمالي الأنشطة: ${items.length}`;
  metaCell.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF666666" } };
  metaCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(3).height = 20;

  sheet.addRow([]);

  // Headers
  const headerRow = sheet.addRow([
    "م",
    "تاريخ النشاط",
    "اسم النشاط والفعالية",
    "التصنيف المعتمد",
    "إجمالي المشاركين",
    "قطري",
    "غير قطري",
    "الحالة",
  ]);

  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF8A1538" },
    };
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  let totalPart = 0;
  let totalQat = 0;
  let totalNonQat = 0;

  items.forEach((item, idx) => {
    totalPart += item.totalParticipants;
    totalQat += item.qatariCount;
    totalNonQat += item.nonQatariCount;

    const r = sheet.addRow([
      idx + 1,
      item.activityDate,
      item.name,
      item.categoryName,
      item.totalParticipants,
      item.qatariCount,
      item.nonQatariCount,
      item.status === "COMPLETED" ? "منفذ" : "مخطط",
    ]);
    r.height = 22;
    r.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 10 };
      cell.alignment = {
        horizontal: colNumber === 3 ? "right" : "center",
        vertical: "middle",
      };
      if (idx % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF9FBFD" },
        };
      }
    });
  });

  // Totals Row
  const totalRow = sheet.addRow([
    "المجموع",
    "-",
    `إجمالي الأنشطة: ${items.length}`,
    "-",
    totalPart,
    totalQat,
    totalNonQat,
    "-",
  ]);
  totalRow.height = 26;
  totalRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF0F4F8" },
    };
  });

  sheet.getColumn(1).width = 8;
  sheet.getColumn(2).width = 16;
  sheet.getColumn(3).width = 38;
  sheet.getColumn(4).width = 24;
  sheet.getColumn(5).width = 16;
  sheet.getColumn(6).width = 14;
  sheet.getColumn(7).width = 14;
  sheet.getColumn(8).width = 14;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
