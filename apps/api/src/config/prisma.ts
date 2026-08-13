import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client';
import { env } from './env';

/**
 * Prisma 7 talks to PostgreSQL through a driver adapter, so pool behaviour is
 * configured here rather than in the connection string.
 */
const createPrismaClient = (): PrismaClient => {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    max: 10,
  });

  return new PrismaClient({
    adapter,
    log: env.isProduction ? ['warn', 'error'] : ['warn', 'error'],
  });
};

declare global {
  var __prismaClient: PrismaClient | undefined;
}

/**
 * Single client per process. The global cache keeps `tsx watch` from opening a
 * new pool on every reload during development.
 */
export const prisma: PrismaClient = globalThis.__prismaClient ?? createPrismaClient();

if (!env.isProduction) {
  globalThis.__prismaClient = prisma;
}

export const disconnectPrisma = async (): Promise<void> => {
  await prisma.$disconnect();
};
