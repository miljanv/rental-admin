import 'dotenv/config';

import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 reads the datasource URL from this file instead of `schema.prisma`.
 * `process.env.DATABASE_URL` is read directly (not through Prisma's `env()`
 * helper) because every CLI command loads this file, including `prisma
 * generate`, which must keep working in CI where no database is configured.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
