import { DEFAULT_MAX_FILE_SIZE_MB, megabytesToBytes } from '@rental-admin/shared';
import { z } from 'zod';

/**
 * Client configuration. Only NEXT_PUBLIC_* values may appear here: everything in
 * this file is inlined into the browser bundle, so no backend secret can be read
 * from it. Each variable is referenced statically so Next.js can replace it at
 * build time.
 */
const hasApiPrefix = (value: string): boolean => {
  try {
    const pathname = new URL(value).pathname.replace(/\/$/, '');
    return pathname === '/api/v1';
  } catch {
    return false;
  }
};

const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .string()
    .url('NEXT_PUBLIC_API_URL must be an absolute URL.')
    .refine(
      hasApiPrefix,
      'NEXT_PUBLIC_API_URL must end with /api/v1 (example: https://xxx.up.railway.app/api/v1).',
    ),
  NEXT_PUBLIC_APP_ENV: z.string().min(1).default('development'),
  NEXT_PUBLIC_APP_VERSION: z.string().min(1).default('0.1.0'),
  NEXT_PUBLIC_MAX_FILE_SIZE_MB: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(DEFAULT_MAX_FILE_SIZE_MB),
});

const parsed = clientEnvSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
  NEXT_PUBLIC_MAX_FILE_SIZE_MB: process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB,
});

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  throw new Error(
    `Invalid client environment configuration:\n${details}\n\nCopy .env.example to .env.local and fill in the values.`,
  );
}

const values = parsed.data;

export const clientEnv = {
  /** Base URL of the API including the /api/v1 prefix, without a trailing slash. */
  apiUrl: values.NEXT_PUBLIC_API_URL.replace(/\/$/, ''),
  appEnv: values.NEXT_PUBLIC_APP_ENV,
  appVersion: values.NEXT_PUBLIC_APP_VERSION,
  maxFileSizeMb: values.NEXT_PUBLIC_MAX_FILE_SIZE_MB,
  maxFileSizeBytes: megabytesToBytes(values.NEXT_PUBLIC_MAX_FILE_SIZE_MB),
} as const;

export const APP_NAME = 'VM Rental';
export const APP_DESCRIPTION = 'Admin panel za autoprevoznike';
export const APP_INITIALS = 'VM';
