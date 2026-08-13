import type { Request, Response } from 'express';

import { APP_VERSION } from '../config/app-info';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { sendSuccess } from '../utils/api-response';
import { logger } from '../utils/logger';

const checkDatabase = async (): Promise<'up' | 'down'> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'up';
  } catch (error) {
    logger.error('Database health check failed', error);
    return 'down';
  }
};

/**
 * Health probe used by Railway. Returns 503 when the database is unreachable so
 * a broken deployment is never promoted to serving traffic.
 */
export const getHealth = async (_req: Request, res: Response): Promise<void> => {
  const database = await checkDatabase();
  const isHealthy = database === 'up';

  sendSuccess(
    res,
    {
      status: isHealthy ? 'ok' : 'degraded',
      version: APP_VERSION,
      environment: env.NODE_ENV,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      dependencies: { database },
    },
    isHealthy ? 200 : 503,
  );
};
