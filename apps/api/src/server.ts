import type { Server } from 'node:http';

import { app } from './app';
import { API_PREFIX, APP_NAME, APP_VERSION } from './config/app-info';
import { env } from './config/env';
import { disconnectPrisma } from './config/prisma';
import { destroyS3Client } from './config/s3';
import { logger } from './utils/logger';

const SHUTDOWN_TIMEOUT_MS = 10_000;

// Binding to 0.0.0.0 is required on Railway so the container is reachable.
const server: Server = app.listen(env.PORT, '0.0.0.0', () => {
  logger.info(`${APP_NAME} v${APP_VERSION} listening`, {
    port: env.PORT,
    environment: env.NODE_ENV,
    apiPrefix: API_PREFIX,
    allowedOrigins: env.allowedOrigins,
  });
});

let isShuttingDown = false;

const shutdown = async (signal: string): Promise<void> => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info(`Received ${signal}, shutting down gracefully`);

  const forceExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  forceExit.unref();

  try {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });

    await disconnectPrisma();
    destroyS3Client();

    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error);
    process.exit(1);
  }
};

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    void shutdown(signal);
  });
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception, shutting down', error);
  void shutdown('uncaughtException');
});
