import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from 'node:crypto';

import { env } from '../config/env';

/** 32 random bytes, URL safe, so the token can sit in a link as-is. */
export const generateDriverAccessToken = (): string => randomBytes(32).toString('base64url');

/** Only this hash is stored; a leaked database row cannot be turned back into a working link. */
export const hashDriverAccessToken = (token: string): string =>
  createHash('sha256').update(token, 'utf8').digest('hex');

/** A well-formed token is exactly 43 base64url characters; anything else is rejected before a lookup. */
export const isWellFormedDriverAccessToken = (value: string): boolean =>
  /^[A-Za-z0-9_-]{43}$/.test(value);

/**
 * The office can show a driver's link again, so the token is also kept encrypted
 * (AES-256-GCM). The key is derived from JWT_SECRET and never stored in the
 * database, so a leaked database alone still cannot open the portal.
 */
const linkKey = (): Buffer =>
  Buffer.from(hkdfSync('sha256', env.JWT_SECRET, 'rental-admin', 'driver-access-link', 32));

export const encryptDriverAccessToken = (token: string): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', linkKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv, encrypted, cipher.getAuthTag()].map((part) => part.toString('base64url')).join('.');
};

/** Null when the value was encrypted with another secret or was tampered with. */
export const decryptDriverAccessToken = (value: string): string | null => {
  const [iv, encrypted, tag] = value.split('.').map((part) => Buffer.from(part, 'base64url'));
  if (!iv || !encrypted || !tag) return null;
  try {
    const decipher = createDecipheriv('aes-256-gcm', linkKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
};
