import { PrismaClient } from '@prisma/client';
import { env } from './env';

/**
 * One PrismaClient per process. In development tsx watch reloads modules,
 * so we stash the instance on `globalThis` to avoid exhausting DB connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isProduction ? ['error'] : ['warn', 'error'],
  });

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}
