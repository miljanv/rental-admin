import { createHash, randomBytes } from 'node:crypto';

/** 32 random bytes, URL safe, so the token can sit in a link as-is. */
export const generateDriverAccessToken = (): string => randomBytes(32).toString('base64url');

/** Only this hash is stored; a leaked database row cannot be turned back into a working link. */
export const hashDriverAccessToken = (token: string): string =>
  createHash('sha256').update(token, 'utf8').digest('hex');

/** A well-formed token is exactly 43 base64url characters; anything else is rejected before a lookup. */
export const isWellFormedDriverAccessToken = (value: string): boolean =>
  /^[A-Za-z0-9_-]{43}$/.test(value);
