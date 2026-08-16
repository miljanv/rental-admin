import { describe, expect, it } from 'vitest';

import { computeTripSettlement } from './trip-expense';

describe('computeTripSettlement', () => {
  it('subtracts expenses, per diems and advances from trip price', () => {
    expect(
      computeTripSettlement({
        price: 100_000,
        expenses: [
          { category: 'FUEL', amount: 20_000 },
          { category: 'TOLL', amount: 5_000 },
          { category: 'FUEL', amount: 3_000 },
        ],
        drivers: [
          { perDiemAmount: 8_000, advanceAmount: 2_000 },
          { perDiemAmount: 8_000, advanceAmount: null },
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
      advanceTotal: 2_000,
      netResult: 54_000,
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
});
