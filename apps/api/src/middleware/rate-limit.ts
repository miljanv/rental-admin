import { API_ERROR_CODES } from '@rental-admin/shared';
import { rateLimit } from 'express-rate-limit';

import { env } from '../config/env';
import { buildErrorBody } from '../utils/api-response';

const rateLimitedBody = buildErrorBody({
  code: API_ERROR_CODES.RATE_LIMITED,
  message: 'Too many requests, please try again later.',
});

const baseOptions = {
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: (
    _req: unknown,
    res: { status: (code: number) => { json: (body: unknown) => void } },
  ) => {
    res.status(429).json(rateLimitedBody);
  },
} as const;

/** Applies to every API route. */
export const apiRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: env.rateLimitWindowMs,
  limit: env.RATE_LIMIT_MAX_REQUESTS,
});

/**
 * Tighter budget for endpoints that issue presigned URLs or mutate storage,
 * since each one costs an S3 operation.
 */
export const uploadRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: env.rateLimitWindowMs,
  limit: env.RATE_LIMIT_MAX_UPLOAD_REQUESTS,
});
