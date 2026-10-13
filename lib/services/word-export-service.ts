import fs from "fs";
import path from "path";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  ImageRun,
  VerticalAlign,
  ShadingType,
} from "docx";

export interface ActivityWordExportData {
  school_name?: string;
  name: string;
  activity_date: string;
  day_name?: string;
  activity_type?: string;
  activity_type_other?: string;
  target_group?: string;
  total_participants?: number;
  qatari_count?: number;
  non_qatari_count?: number;
  responsible_department?: string;
  external_entity?: string;
  external_honored?: boolean;
  parent_participation?: boolean;
  activation_method?: string;
  activation_method_other?: string;
  objectives?: string;
  execution_steps?: string;
  safety_measures?: string;
  student_satisfaction?: number;
  activity_quality?: number;
  recommendations?: string;
  photos?: Array<{ path: string; original_name?: string }>;
}

function getArabicDayName(dateStr: string) {
  try {
    const dt = new Date(dateStr);
    const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    return days[dt.getDay()] || "—";
  } catch {
    return "—";
  }
}

function createTextRun(text: string, options: { bold?: boolean; size?: number; color?: string } = {}) {
  return new TextRun({
    text: text || "—",
    bold: options.bold ?? false,
    size: options.size ?? 22, // 11pt
    font: "Cairo",
    color: options.color ?? "1E293B",
    rightToLeft: true,
  });
}

function createCell(
  content: string | Paragraph[],
  options: {
    widthPercent?: number;
    isHeader?: boolean;
    colSpan?: number;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    bgColor?: string;
    bold?: boolean;
  } = {}
) {
  const isHeader = options.isHeader ?? false;
  const bgColor = options.bgColor ?? (isHeader ? "F8FAFC" : "FFFFFF");

  let paragraphs: Paragraph[] = [];
  if (typeof content === "string") {
    paragraphs = [
      new Paragraph({
        alignment: options.align ?? AlignmentType.RIGHT,
        children: [
          createTextRun(content, {
            bold: options.bold ?? isHeader,
            color: isHeader ? "8A1538" : "1E293B",
          }),
        ],
      }),
    ];
  } else {
    paragraphs = content;
  }

  return new TableCell({
    width: options.widthPercent ? { size: options.widthPercent, type: WidthType.PERCENTAGE } : undefined,
    columnSpan: options.colSpan ?? 1,
    verticalAlign: VerticalAlign.CENTER,
    shading: {
      type: ShadingType.CLEAR,
      fill: bgColor,
    },
    margins: {
      top: 120,
      bottom: 120,
      left: 140,
      right: 140,
    },
    children: paragraphs,
  });
}

export async function generateActivityWordDocument(data: ActivityWordExportData): Promise<Buffer> {
  const schoolName = data.school_name || "مدرسة عبد الله بن علي المسند الثانوية للبنين";
  const dateStr = strDate(data.activity_date);
  const dayName = data.day_name || getArabicDayName(data.activity_date);

  const actType = data.activity_type || "خطة معتمدة";
  const actTypeDisplay = [
    actType === "خطة معتمدة" ? "[✔] خطة معتمدة" : "[  ] خطة معتمدة",
    actType === "مناسبة" ? "[✔] مناسبة" : "[  ] مناسبة",
    actType === "هوية وطنية" ? "[✔] هوية وطنية" : "[  ] هوية وطنية",
    actType === "قيم تربوية" ? "[✔] قيم تربوية" : "[  ] قيم تربوية",
    actType === "تعميم" ? "[✔] تعميم" : "[  ] تعميم",
    actType === "أخرى" ? `[✔] أخرى (${data.activity_type_other || ""})` : "[  ] أخرى",
  ].join("     ");

  const actMethod = data.activation_method || "فعالية";
  const actMethodDisplay = [
    actMethod === "إذاعة" ? "[✔] إذاعة" : "[  ] إذاعة",
    actMethod === "طابور" ? "[✔] طابور" : "[  ] طابور",
    actMethod === "ورشة" ? "[✔] ورشة" : "[  ] ورشة",
    actMethod === "معرض" ? "[✔] معرض" : "[  ] معرض",
    actMethod === "مسابقة" ? "[✔] مسابقة" : "[  ] مسابقة",
    actMethod === "فعالية" ? "[✔] فعالية" : "[  ] فعالية",
    actMethod === "أخرى" ? `[✔] أخرى (${data.activation_method_other || ""})` : "[  ] أخرى",
  ].join("     ");

  const total = data.total_participants ?? 0;
  const qatari = data.qatari_count ?? 0;
  const nonQatari = data.non_qatari_count ?? 0;
  const participantsStr = `الإجمالي: (${total})   |   قطري: (${qatari})   |   غير قطري: (${nonQatari})`;

  const extHonored = data.external_honored ? "[✔] تم تكريمها" : "[  ] لم يتم تكريمها";
  const parentPart = data.parent_participation ? "[✔] مشاركة ولي الأمر" : "[  ] مشاركة ولي الأمر";
  const extStr = `${data.external_entity || "—"}   (${extHonored}   |   ${parentPart})`;

  const satScore = Number(data.student_satisfaction ?? 5);
  const qualScore = Number(data.activity_quality ?? 5);

  const formatRatingStr = (score: number) =>
    [5, 4, 3, 2, 1]
      .map((s) => (s === score ? `[✔] ${s} نجوم` : `[  ] ${s} نجوم`))
      .join("      ");

  // Build the main details table
  const mainTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 8, color: "CBD5E1" },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: "CBD5E1" },
      left: { style: BorderStyle.SINGLE, size: 8, color: "CBD5E1" },
      right: { style: BorderStyle.SINGLE, size: 8, color: "CBD5E1" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
    },
    rows: [
      // Row 1: School Name & Date
      new TableRow({
        children: [
          createCell(schoolName, { widthPercent: 55, bold: true }),
          createCell("اسم المدرسة", { widthPercent: 15, isHeader: true }),
          createCell(`${dayName} - ${dateStr}`, { widthPercent: 20 }),
          createCell("اليوم والتاريخ", { widthPercent: 10, isHeader: true }),
        ],
      }),

      // Row 2: Activity Title
      new TableRow({
        children: [
          createCell(data.name || "—", { widthPercent: 85, colSpan: 3, bold: true }),
          createCell("عنوان الفعالية", { widthPercent: 15, isHeader: true }),
        ],
      }),

      // Row 3: Activity Type
      new TableRow({
        children: [
          createCell(actTypeDisplay, { widthPercent: 85, colSpan: 3 }),
          createCell("نوع النشاط", { widthPercent: 15, isHeader: true }),
        ],
      }),

      // Row 4: Target Group & Participants
      new TableRow({
        children: [
          createCell(participantsStr, { widthPercent: 45, bold: true }),
          createCell("أعداد المشاركين", { widthPercent: 15, isHeader: true }),
          createCell(data.target_group || "جميع طلاب المدرسة", { widthPercent: 25 }),
          createCell("الفئة المستهدفة", { widthPercent: 15, isHeader: true }),
        ],
      }),

      // Row 5: Responsible Dept & External Entity
      new TableRow({
        children: [
          createCell(extStr, { widthPercent: 45 }),
          createCell("الجهة الخارجية", { widthPercent: 15, isHeader: true }),
          createCell(data.responsible_department || "قسم الأنشطة", { widthPercent: 25 }),
          createCell("القسم المسؤول", { widthPercent: 15, isHeader: true }),
        ],
      }),

      // Row 6: Activation Method
      new TableRow({
        children: [
          createCell(actMethodDisplay, { widthPercent: 85, colSpan: 3 }),
          createCell("أسلوب التفعيل", { widthPercent: 15, isHeader: true }),
        ],
      }),

      // Row 7: Objectives
      new TableRow({
        children: [
          createCell(data.objectives || "تنمية معارف ومهارات الطلاب القيادية والإبداعية وتفعيل الشراكة المجتمعية.", {
            widthPercent: 85,
            colSpan: 3,
          }),
          createCell("أهداف النشاط", { widthPercent: 15, isHeader: true }),
        ],
      }),

      // Row 8: Execution Steps
      new TableRow({
        children: [
          createCell(data.execution_steps || "1. الإعداد والتنسيق المسبق للفعالية وحصر الاحتياجات.\n2. تنفيذ البرنامج وتوزيع الأدوار على الطلاب.\n3. التقييم الميداني وتكريم المتميزين.", {
            widthPercent: 85,
            colSpan: 3,
          }),
          createCell("خطوات التنفيذ", { widthPercent: 15, isHeader: true }),
        ],
      }),

      // Row 9: Safety Measures
      new TableRow({
        children: [
          createCell(data.safety_measures || "الالتزام التام بكافة معايير الأمن والسلامة المدرسية وتوفير الإشراف الميداني المستمر.", {
            widthPercent: 85,
            colSpan: 3,
          }),
          createCell("إجراءات السلامة", { widthPercent: 15, isHeader: true }),
        ],
      }),

      // Row 10: Student Satisfaction
      new TableRow({
        children: [
          createCell(formatRatingStr(satScore), { widthPercent: 85, colSpan: 3 }),
          createCell("مدى رضا الطلاب", { widthPercent: 15, isHeader: true }),
        ],
      }),

      // Row 11: Activity Quality
      new TableRow({
        children: [
          createCell(formatRatingStr(qualScore), { widthPercent: 85, colSpan: 3 }),
          createCell("جودة الفعالية", { widthPercent: 15, isHeader: true }),
        ],
      }),

      // Row 12: Recommendations
      new TableRow({
        children: [
          createCell(data.recommendations || "مواصلة تنظيم مثل هذه البرامج الهادفة وتطوير آليات التقييم والتكريم.", {
            widthPercent: 85,
            colSpan: 3,
          }),
          createCell("التوصيات والملاحظات", { widthPercent: 15, isHeader: true }),
        ],
      }),
    ],
  });

  // Prepare photos section
  const photoCells: TableCell[] = [];
  const photos = data.photos || [];

  for (let i = 0; i < 4; i++) {
    const photo = photos[i];
    let photoParagraph: Paragraph;

    if (photo && photo.path && fs.existsSync(photo.path)) {
      try {
        const imageBuffer = fs.readFileSync(photo.path);
        const ext = path.extname(photo.path).toLowerCase().replace(".", "");
        const imgType = (ext === "png" || ext === "gif" || ext === "bmp" ? ext : "jpg") as "jpg" | "png" | "gif" | "bmp";

        photoParagraph = new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: imageBuffer,
              transformation: {
                width: 260,
                height: 180,
              },
              type: imgType,
            }),
          ],
        });
      } catch {
        photoParagraph = new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [createTextRun(`صورة توثيقية (${i + 1}) - تعذر قراءة الملف`, { color: "94A3B8" })],
        });
      }
    } else {
      photoParagraph = new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          createTextRun(`[إطار الصورة التوثيقية رقم ${i + 1}]`, { color: "94A3B8" }),
        ],
      });
    }

    photoCells.push(
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 120, bottom: 120, left: 120, right: 120 },
        children: [
          photoParagraph,
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              createTextRun(`توثيق الفعالية - صورة (${i + 1})`, { size: 18, color: "64748B" }),
            ],
          }),
        ],
      })
    );
  }

  const photosTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1" },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1" },
      left: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1" },
      right: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1" },
      insideVertical: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1" },
    },
    rows: [
      new TableRow({
        children: [photoCells[0], photoCells[1]],
      }),
      new TableRow({
        children: [photoCells[2], photoCells[3]],
      }),
    ],
  });

  // Signatures Table
  const signaturesTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [createTextRun("مشرف الأنشطة المدرسية", { bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [createTextRun("التوقيع: ................................")],
              }),
            ],
          }),
          new TableCell({
            width: { size: 34, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [createTextRun("الختم المدرسي المعتمد", { bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [createTextRun(".........................................")],
              }),
            ],
          }),
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [createTextRun("مدير المدرسة / النائب الأكاديمي", { bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [createTextRun("التوقيع: ................................")],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Assemble full Word Document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,    // 0.5 inch
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children: [
          // Header titles
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              createTextRun("دولة قطر — وزارة التربية والتعليم والتعليم العالي", {
                size: 26,
                bold: true,
                color: "8A1538",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              createTextRun(schoolName, {
                size: 24,
                bold: true,
                color: "1E293B",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              createTextRun("تقرير توثيق فعاليات وأنشطة المدرسة الرسمية", {
                size: 22,
                color: "64748B",
              }),
            ],
          }),

          // Main data table
          mainTable,

          new Paragraph({ spacing: { before: 200, after: 100 } }),

          // Photo Documentation Title
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 120 },
            children: [
              createTextRun("التوثيق المصور للفعالية (معرض الصور)", {
                size: 24,
                bold: true,
                color: "8A1538",
              }),
            ],
          }),

          // Photo grid table
          photosTable,

          new Paragraph({ spacing: { before: 240, after: 120 } }),

          // Signatures table
          signaturesTable,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

function strDate(val: unknown): string {
  if (!val) return "—";
  try {
    return new Date(val as string).toISOString().split("T")[0];
  } catch {
    return String(val);
  }
}
