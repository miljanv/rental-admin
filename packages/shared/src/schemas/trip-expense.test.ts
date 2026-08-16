import { describe, expect, it } from 'vitest';

import { tripExpenseWriteSchema, tripSettlementWriteSchema } from './trip-expense';

describe('tripExpenseWriteSchema', () => {
  it('accepts a cash fuel expense and normalizes an empty note', () => {
    const result = tripExpenseWriteSchema.safeParse({
      category: 'FUEL',
      amount: 12_500,
      paymentMethod: 'CASH',
      note: '',
    });

    expect(result.success).toBe(true);
    expect(result.data?.note).toBeNull();
    expect(result.data?.fileId).toBeNull();
  });

  it('rejects a zero amount', () => {
    expect(
      tripExpenseWriteSchema.safeParse({
        category: 'TOLL',
        amount: 0,
        paymentMethod: 'INVOICE',
      }).success,
    ).toBe(false);
  });

  it('rejects a finance-module payment method that is not one of the three trip methods', () => {
    expect(
      tripExpenseWriteSchema.safeParse({
        category: 'PARKING',
        amount: 800,
        paymentMethod: 'ACCOUNT',
      }).success,
    ).toBe(false);
  });
});

describe('tripSettlementWriteSchema', () => {
  it('normalizes empty paidAt and carrierId to null', () => {
    const result = tripSettlementWriteSchema.safeParse({ paidAt: '', carrierId: '' });

    expect(result.success).toBe(true);
    expect(result.data?.paidAt).toBeNull();
    expect(result.data?.carrierId).toBeNull();
  });

  it('accepts per-driver allowances', () => {
    const result = tripSettlementWriteSchema.safeParse({
      drivers: [{ driverId: 'drv_1', perDiemAmount: 8_000, advanceAmount: '' }],
    });

    expect(result.success).toBe(true);
    expect(result.data?.drivers?.[0]?.advanceAmount).toBeNull();
  });
});
