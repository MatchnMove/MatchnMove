import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// Keep one pool per Node process. This also prevents extra clients during local hot reloads.
globalForPrisma.prisma = prisma;
