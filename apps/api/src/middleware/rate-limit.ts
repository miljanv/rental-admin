import { API_ERROR_CODES, DRIVER_ACCESS_HEADER } from '@rental-admin/shared';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

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

/** Login is cheaper to brute-force than file uploads, so it gets a tighter cap. */
export const loginRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: env.rateLimitWindowMs,
  limit: 20,
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

/**
 * The driver portal is reachable without signing in, so it gets its own caps:
 * one per client address and one per link, so a shared address (a depot's
 * Wi-Fi) or a single leaked link cannot exhaust it for everyone.
 */
export const driverPortalIpRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: env.rateLimitWindowMs,
  limit: 300,
});

export const driverPortalTokenRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: env.rateLimitWindowMs,
  limit: 120,
  keyGenerator: (req) => {
    const token = req.header(DRIVER_ACCESS_HEADER)?.trim();

    return token ? `driver:${token.slice(0, 16)}` : ipKeyGenerator(req.ip ?? '');
  },
});
