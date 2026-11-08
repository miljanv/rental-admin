import { describe, expect, it } from 'vitest';

import { vatReturnWriteSchema } from './vat-return';

describe('vatReturnWriteSchema', () => {
  const valid = { year: 2026, month: 9, kind: 'PAYABLE', amount: 125_400.5 } as const;

  it('accepts a payable return and clears empty optional fields', () => {
    const result = vatReturnWriteSchema.parse({ ...valid, documentNumber: '', filedAt: '' });

    expect(result).toMatchObject({ kind: 'PAYABLE', documentNumber: null, filedAt: null });
  });

  it('rejects a zero amount and an invalid month', () => {
    expect(vatReturnWriteSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
    expect(vatReturnWriteSchema.safeParse({ ...valid, month: 13 }).success).toBe(false);
  });
});
