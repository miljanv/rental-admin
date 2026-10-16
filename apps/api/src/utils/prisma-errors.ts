/** Postgres unique violation (P2002), matched structurally like the error handler does. */
export const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code: unknown }).code === 'P2002';
