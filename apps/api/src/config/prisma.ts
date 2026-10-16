import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client';
import { env } from './env';
import { tenantScopeExtension } from './tenant-scope';

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
const baseClient: PrismaClient = globalThis.__prismaClient ?? createPrismaClient();

if (!env.isProduction) {
  globalThis.__prismaClient = baseClient;
}

/**
 * The client every service uses. Business data is automatically limited to the
 * organization of the current request (see `tenant-scope.ts`), and a query on
 * business data without an organization in scope throws.
 */
export const prisma = baseClient.$extends(tenantScopeExtension);

/**
 * The client handed to an interactive `$transaction` callback. Prisma's own
 * `Prisma.TransactionClient` describes the unextended client and does not
 * accept the tenant-scoped one, so helpers that take a transaction use this.
 */
export type TransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends' | '$use'
>;

/**
 * Bypasses tenant filtering. Reserved for the superadmin overview (counts
 * across organizations) and one-off scripts. Never use it for a query that
 * serves a regular user's request.
 */
export const prismaUnscoped: PrismaClient = baseClient;

export const disconnectPrisma = async (): Promise<void> => {
  await baseClient.$disconnect();
};
