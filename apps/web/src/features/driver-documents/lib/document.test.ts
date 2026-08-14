import { describe, expect, it } from 'vitest';

import { formatExpiryLabel } from './document';

describe('formatExpiryLabel', () => {
  it('describes an indefinite document', () => {
    expect(formatExpiryLabel(null, '2026-08-14')).toBe('Ne ističe');
  });

  it('describes overdue and upcoming expiries in Serbian', () => {
    expect(formatExpiryLabel('2026-08-01', '2026-08-14')).toContain('Istekao');
    expect(formatExpiryLabel('2026-08-14', '2026-08-14')).toContain('Ističe danas');
    expect(formatExpiryLabel('2026-08-21', '2026-08-14')).toContain('za 7 dana');
  });
});
