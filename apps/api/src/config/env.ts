import 'dotenv/config';

import { megabytesToBytes } from '@rental-admin/shared';
import { z } from 'zod';

/**
 * A presigned download URL must be short lived. Five minutes is the hard
 * ceiling for both upload and download URLs.
 */
const MAX_PRESIGNED_EXPIRY_SECONDS = 300;

const booleanFromString = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .default(false)
  .transform((value) => value === true || value === 'true' || value === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required.'),

  /**
   * Comma separated list of allowed browser origins. Multiple values support
   * Vercel preview deployments; wildcards are never accepted.
   */
  FRONTEND_URL: z.string().min(1, 'FRONTEND_URL is required.'),

  AWS_REGION: z.string().min(1, 'AWS_REGION is required.'),
  AWS_S3_BUCKET_NAME: z.string().min(1, 'AWS_S3_BUCKET_NAME is required.'),
  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS_ACCESS_KEY_ID is required.'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS_SECRET_ACCESS_KEY is required.'),

  /** Optional S3-compatible endpoint (MinIO, LocalStack) for local testing. */
  AWS_S3_ENDPOINT: z.string().url().optional(),
  AWS_S3_FORCE_PATH_STYLE: booleanFromString,

  PRESIGNED_UPLOAD_EXPIRES_IN: z.coerce
    .number()
    .int()
    .min(30)
    .max(MAX_PRESIGNED_EXPIRY_SECONDS)
    .default(300),
  PRESIGNED_DOWNLOAD_EXPIRES_IN: z.coerce
    .number()
    .int()
    .min(30)
    .max(MAX_PRESIGNED_EXPIRY_SECONDS)
    .default(300),

  MAX_FILE_SIZE_MB: z.coerce.number().int().min(1).max(100).default(25),

  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().min(1).max(60).default(15),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(10).max(10_000).default(300),
  RATE_LIMIT_MAX_UPLOAD_REQUESTS: z.coerce.number().int().min(1).max(1_000).default(60),

  /**
   * HMAC secret for access tokens. Must be at least 32 characters. Rotate it
   * to invalidate every outstanding session.
   */
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters.'),
  JWT_EXPIRES_IN: z.string().min(2).default('7d'),
});

export type RawEnv = z.infer<typeof envSchema>;

const parseOrigins = (value: string): string[] =>
  value
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter((origin) => origin.length > 0);

const buildConfig = (raw: RawEnv) => {
  const allowedOrigins = parseOrigins(raw.FRONTEND_URL);

  if (allowedOrigins.length === 0) {
    throw new Error('FRONTEND_URL must contain at least one origin.');
  }

  if (allowedOrigins.includes('*')) {
    throw new Error('FRONTEND_URL must list explicit origins, "*" is not allowed.');
  }

  return {
    ...raw,
    isProduction: raw.NODE_ENV === 'production',
    isTest: raw.NODE_ENV === 'test',
    allowedOrigins,
    maxFileSizeBytes: megabytesToBytes(raw.MAX_FILE_SIZE_MB),
    rateLimitWindowMs: raw.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  };
};

export type AppConfig = ReturnType<typeof buildConfig>;

/**
 * Validates `process.env` and returns the typed application config.
 * Throws with a readable summary so a misconfigured deployment fails fast.
 */
export const loadEnv = (source: NodeJS.ProcessEnv = process.env): AppConfig => {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');

    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return buildConfig(result.data);
};

const loadEnvOrExit = (): AppConfig => {
  try {
    return loadEnv();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }
};

export const env: AppConfig = loadEnvOrExit();
