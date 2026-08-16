import { describe, expect, it } from 'vitest';

import { defaultMaRegisteredAt, nextSequentialDocumentNumber } from './generated-document';

describe('nextSequentialDocumentNumber', () => {
  it('starts at 1 when nothing numeric exists yet', () => {
    expect(nextSequentialDocumentNumber([])).toBe('1');
    expect(nextSequentialDocumentNumber(['MA-20260616-abc', 'FIKT-MA-1'])).toBe('1');
  });

  it('increments the largest purely-numeric delovodni broj', () => {
    expect(nextSequentialDocumentNumber(['3', '12', 'MA-20260616-x', '8'])).toBe('13');
  });
});

describe('defaultMaRegisteredAt', () => {
  it('is the day after signing, at 09:15', () => {
    expect(defaultMaRegisteredAt('2026-06-15')).toBe('2026-06-16T09:15');
  });
});
