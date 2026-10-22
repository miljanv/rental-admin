import { describe, expect, it } from 'vitest';

import { computeTripSettlement } from './trip-expense';

describe('computeTripSettlement', () => {
  it('subtracts only paid RSD per diems and never deducts a travel advance twice', () => {
    expect(
      computeTripSettlement({
        price: 100_000,
        expenses: [
          { category: 'FUEL', amount: 20_000 },
          { category: 'TOLL', amount: 5_000 },
          { category: 'FUEL', amount: 3_000 },
        ],
        drivers: [
          {
            perDiemAmount: 8_000,
            perDiemCurrency: 'RSD',
            perDiemStatus: 'PAID',
            perDiemPaidAmount: 8_000,
            advanceAmount: 2_000,
          },
          {
            perDiemAmount: 8_000,
            perDiemCurrency: 'RSD',
            perDiemStatus: 'APPROVED',
            perDiemPaidAmount: null,
            advanceAmount: null,
          },
        ],
      }),
    ).toEqual({
      revenue: 100_000,
      expensesTotal: 28_000,
      byCategory: [
        { category: 'FUEL', total: 23_000 },
        { category: 'TOLL', total: 5_000 },
      ],
      perDiemTotal: 16_000,
      foreignPerDiemTotal: 0,
      perDiemPaidTotal: 8_000,
      advanceTotal: 2_000,
      netResult: 64_000,
    });
  });

  it('treats a missing price as zero revenue', () => {
    expect(
      computeTripSettlement({
        price: null,
        expenses: [{ category: 'PARKING', amount: 500 }],
        drivers: [],
      }).netResult,
    ).toBe(-500);
  });

  it('uses an explicitly entered RSD payment for a foreign per-diem', () => {
    expect(
      computeTripSettlement({
        price: 10_000,
        expenses: [],
        drivers: [
          {
            perDiemAmount: 90,
            perDiemCurrency: 'EUR',
            perDiemStatus: 'PAID',
            perDiemPaidAmount: 10_800,
            advanceAmount: null,
          },
        ],
      }).netResult,
    ).toBe(-800);
  });
});
