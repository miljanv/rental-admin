import bcrypt from 'bcryptjs';

import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

/** Same cost as every other password hash in the system. */
const BCRYPT_COST = 12;

/**
 * Creates the first superadmin from `SUPERADMIN_USERNAME` / `SUPERADMIN_PASSWORD`.
 * Idempotent and non-destructive: an account that already exists, with any
 * role or password, is left exactly as it is.
 */
export const ensureBootstrapSuperadmin = async (): Promise<void> => {
  const username = env.SUPERADMIN_USERNAME;
  const password = env.SUPERADMIN_PASSWORD;

  if (!username && !password) {
    return;
  }

  if (!username || !password) {
    logger.warn('SUPERADMIN_USERNAME and SUPERADMIN_PASSWORD must both be set; skipping.');
    return;
  }

  const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });

  if (existing) {
    return;
  }

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: await bcrypt.hash(password, BCRYPT_COST),
      role: 'SUPERADMIN',
      organizationId: null,
    },
    select: { id: true },
  });

  logger.info('Bootstrap superadmin created', { userId: user.id });
};
