import { prisma } from "../db/prisma";
import { logAudit } from "../audit/audit-service";

export interface InspirationalQuoteItem {
  id: string;
  quote_text: string;
  author_title: string | null;
  sub_title: string | null;
  image_url: string;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const DEFAULT_QUOTES = [
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
];

function getQuoteDb() {
  if ((prisma as any).inspirationalQuote) {
    return (prisma as any).inspirationalQuote;
  }
  try {
    const { PrismaClient } = require("@prisma/client");
    const fresh = new PrismaClient();
    if (fresh.inspirationalQuote) {
      (prisma as any).inspirationalQuote = fresh.inspirationalQuote;
      return fresh.inspirationalQuote;
    }
  } catch {}
  return null;
}

const quoteDb: any = new Proxy(
  {},
  {
    get(_, prop) {
      const model = getQuoteDb();
      if (!model) {
        throw new Error("قاعدة البيانات غير مهيأة بعد للعبارات التحفيزية.");
      }
      const val = model[prop];
      return typeof val === "function" ? val.bind(model) : val;
    },
  }
);

/**
 * Ensures initial default quotes exist in the database
 */
async function ensureDefaultQuotes() {
  const model = getQuoteDb();
  if (!model) return;
  try {
    const count = await model.count();
    if (count === 0) {
      for (const q of DEFAULT_QUOTES) {
        await model.create({
          data: q,
        });
      }
    }
  } catch (err) {
    console.error("ensureDefaultQuotes error:", err);
  }
}

export async function getInspirationalQuotes(onlyActive = true): Promise<InspirationalQuoteItem[]> {
  try {
    await ensureDefaultQuotes();
    const model = getQuoteDb();
    if (model) {
      const quotes = await model.findMany({
        where: onlyActive ? { is_active: true } : {},
        orderBy: { display_order: "asc" },
      });
      if (quotes && quotes.length > 0) {
        return quotes;
      }
    }
  } catch (err) {
    console.error("Failed to fetch quotes from DB, falling back to defaults:", err);
  }

  // Fallback defaults if table is loading or offline
  return DEFAULT_QUOTES.map((q, idx) => ({
    id: `default-${idx + 1}`,
    ...q,
    created_at: new Date(),
    updated_at: new Date(),
  }));
}

export interface CreateQuoteInput {
  quote_text: string;
  author_title?: string;
  sub_title?: string;
  image_url?: string;
  display_order?: number;
  is_active?: boolean;
}

export async function createInspirationalQuote(
  input: CreateQuoteInput,
  actorUserId?: string
) {
  const quote_text = input.quote_text.trim();
  if (!quote_text) {
    throw new Error("نص الاقتباس / العبارة التحفيزية مطلوب.");
  }

  let display_order = input.display_order;
  if (display_order === undefined || display_order === null) {
    const maxOrder = await quoteDb.aggregate({
      _max: { display_order: true },
    });
    display_order = (maxOrder._max.display_order ?? 0) + 1;
  }

  const quote = await quoteDb.create({
    data: {
      quote_text,
      author_title: input.author_title?.trim() || null,
      sub_title: input.sub_title?.trim() || null,
      image_url: input.image_url?.trim() || "/back.jpg",
      display_order,
      is_active: input.is_active ?? true,
    },
  });

  await logAudit({
    actorUserId,
    action: "CREATE_INSPIRATIONAL_QUOTE",
    entityType: "inspirational_quote",
    entityId: quote.id,
    afterData: quote,
  });

  return quote;
}

export interface UpdateQuoteInput {
  quote_text?: string;
  author_title?: string;
  sub_title?: string;
  image_url?: string;
  display_order?: number;
  is_active?: boolean;
}

export async function updateInspirationalQuote(
  id: string,
  input: UpdateQuoteInput,
  actorUserId?: string
) {
  const existing = await quoteDb.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("العبارة التحفيزية غير موجودة.");
  }

  const data: {
    quote_text?: string;
    author_title?: string | null;
    sub_title?: string | null;
    image_url?: string;
    display_order?: number;
    is_active?: boolean;
  } = {};

  if (input.quote_text !== undefined) {
    const trimmed = input.quote_text.trim();
    if (!trimmed) throw new Error("نص العبارة التحفيزية لا يمكن أن يكون فارغاً.");
    data.quote_text = trimmed;
  }

  if (input.author_title !== undefined) {
    data.author_title = input.author_title?.trim() || null;
  }

  if (input.sub_title !== undefined) {
    data.sub_title = input.sub_title?.trim() || null;
  }

  if (input.image_url !== undefined) {
    data.image_url = input.image_url?.trim() || "/back.jpg";
  }

  if (input.display_order !== undefined) {
    data.display_order = input.display_order;
  }

  if (input.is_active !== undefined) {
    data.is_active = input.is_active;
  }

  const updated = await quoteDb.update({
    where: { id },
    data,
  });

  await logAudit({
    actorUserId,
    action: "UPDATE_INSPIRATIONAL_QUOTE",
    entityType: "inspirational_quote",
    entityId: id,
    beforeData: existing,
    afterData: updated,
  });

  return updated;
}

export async function deleteInspirationalQuote(id: string, actorUserId?: string) {
  const existing = await quoteDb.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("العبارة التحفيزية غير موجودة.");
  }

  // Ensure at least one quote remains
  const totalCount = await quoteDb.count();
  if (totalCount <= 1) {
    throw new Error("يجب الإبقاء على عبارة تحفيزية واحدة على الأقل في النظام.");
  }

  await quoteDb.delete({
    where: { id },
  });

  await logAudit({
    actorUserId,
    action: "DELETE_INSPIRATIONAL_QUOTE",
    entityType: "inspirational_quote",
    entityId: id,
    beforeData: existing,
  });

  return true;
}

export async function toggleInspirationalQuoteStatus(id: string, actorUserId?: string) {
  const existing = await quoteDb.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("العبارة غير موجودة.");
  }

  const updated = await quoteDb.update({
    where: { id },
    data: { is_active: !existing.is_active },
  });

  await logAudit({
    actorUserId,
    action: "TOGGLE_QUOTE_STATUS",
    entityType: "inspirational_quote",
    entityId: id,
    beforeData: { is_active: existing.is_active },
    afterData: { is_active: updated.is_active },
  });

  return updated;
}
