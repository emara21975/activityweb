import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Reset stale cached instance in dev server if new models were added
if (globalForPrisma.prisma && !(globalForPrisma.prisma as any).inspirationalQuote) {
  try {
    (globalForPrisma.prisma as any).$disconnect?.();
  } catch {}
  globalForPrisma.prisma = undefined;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

