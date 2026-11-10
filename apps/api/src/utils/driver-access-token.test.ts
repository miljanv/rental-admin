import { describe, expect, it } from 'vitest';

import {
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
});
