import { describe, expect, it } from 'vitest';

import { formatKm, portalHref } from './portal';

describe('portal helpers', () => {
  it('builds portal links with the token in the path', () => {
    expect(portalHref('abc_DEF-1')).toBe('/v/abc_DEF-1');
    expect(portalHref('abc_DEF-1', 'trip_1')).toBe('/v/abc_DEF-1/trip_1');
  });

  it('formats kilometers, with a dash when unknown', () => {
    expect(formatKm(null)).toBe('—');
    expect(formatKm(162)).toContain('162');
  });
});
