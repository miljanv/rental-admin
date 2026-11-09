import { describe, expect, it } from 'vitest';

import { isAtLimit, usagePercent } from './usage';

describe('usagePercent', () => {
  it('has nothing to show without a limit', () => {
    expect(usagePercent(12, null)).toBeNull();
  });

  it('rounds and caps at 100', () => {
    expect(usagePercent(1, 3)).toBe(33);
    expect(usagePercent(7, 5)).toBe(100);
  });

  it('treats a zero limit as full once anything exists', () => {
    expect(usagePercent(0, 0)).toBe(0);
    expect(usagePercent(1, 0)).toBe(100);
  });
});

describe('isAtLimit', () => {
  it('is reached at the limit, never without one', () => {
    expect(isAtLimit(5, 5)).toBe(true);
    expect(isAtLimit(4, 5)).toBe(false);
    expect(isAtLimit(500, null)).toBe(false);
  });
});
