import { PrismaClient } from "@prisma/client";

// Prevents exhausting DB connections from Next.js dev-mode hot reloads,
// which would otherwise create a fresh PrismaClient on every file change.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
