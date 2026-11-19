import { describe, expect, it } from 'vitest';

import {
  decryptDriverAccessToken,
  encryptDriverAccessToken,
  generateDriverAccessToken,
  hashDriverAccessToken,
  isWellFormedDriverAccessToken,
} from './driver-access-token';

describe('driver access token', () => {
  it('is long, URL safe and different every time', () => {
    const first = generateDriverAccessToken();
    const second = generateDriverAccessToken();

    expect(isWellFormedDriverAccessToken(first)).toBe(true);
    expect(first).not.toBe(second);
  });

  it('hashes to a stable value that is not the token', () => {
    const token = generateDriverAccessToken();

    expect(hashDriverAccessToken(token)).toBe(hashDriverAccessToken(token));
    expect(hashDriverAccessToken(token)).not.toContain(token);
    expect(hashDriverAccessToken(token)).toHaveLength(64);
  });

  it('rejects anything that cannot be a token', () => {
    expect(isWellFormedDriverAccessToken('')).toBe(false);
    expect(isWellFormedDriverAccessToken('abc')).toBe(false);
    expect(isWellFormedDriverAccessToken(`${'a'.repeat(42)}/`)).toBe(false);
  });

  it('encrypts the token so only the server can show it again', () => {
    const token = generateDriverAccessToken();
    const encrypted = encryptDriverAccessToken(token);

    expect(encrypted).not.toContain(token);
    expect(encryptDriverAccessToken(token)).not.toBe(encrypted);
    expect(decryptDriverAccessToken(encrypted)).toBe(token);
  });

  it('refuses a tampered or malformed value', () => {
    const [iv, data, tag] = encryptDriverAccessToken(generateDriverAccessToken()).split('.');
    const flipped = `${data!.startsWith('A') ? 'B' : 'A'}${data!.slice(1)}`;

    expect(decryptDriverAccessToken(`${iv}.${flipped}.${tag}`)).toBeNull();
    expect(decryptDriverAccessToken('not-encrypted')).toBeNull();
  });
});
