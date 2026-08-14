import cors, { type CorsOptions } from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { API_PREFIX } from './config/app-info';
import { env } from './config/env';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';
import { apiRateLimiter } from './middleware/rate-limit';
import { requestLogger } from './middleware/request-logger';
import { apiRouter } from './routes';
import { forbidden } from './utils/app-error';

/**
 * Only the configured frontend origins may call the API. Requests without an
 * Origin header (server-to-server, curl, health probes) are allowed through;
 * they are not subject to the browser's same-origin rules anyway.
 */
const buildCorsOptions = (): CorsOptions => ({
  origin: (origin, callback) => {
    if (!origin || env.allowedOrigins.includes(origin.replace(/\/$/, ''))) {
      callback(null, true);
      return;
    }

    // Surfaces as a 403 with the standard error envelope instead of a 500.
    callback(forbidden(`Origin ${origin} is not allowed by CORS.`));
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  maxAge: 86_400,
});

export const createApp = (): Express => {
  const app = express();

  // Railway terminates TLS in front of the app; a fixed hop count keeps
  // rate limiting keyed on the real client IP without trusting every header.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors(buildCorsOptions()));
  app.use(requestLogger);

  // Only small JSON payloads reach this server: file bytes go straight to S3.
  app.use(express.json({ limit: '64kb' }));

  app.use(API_PREFIX, apiRateLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export const app = createApp();
