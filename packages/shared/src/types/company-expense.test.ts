import { describe, expect, it } from 'vitest';

import { inferCompanyExpenseVatRate, splitCompanyExpenseAmount } from './company-expense';

describe('splitCompanyExpenseAmount', () => {
  it('keeps the entered total and splits 20% VAT', () => {
    expect(splitCompanyExpenseAmount(12_000, 20)).toEqual({
      amountWithoutVat: 10_000,
      vatAmount: 2_000,
      amountWithVat: 12_000,
    });
  });

  it('splits 10% VAT', () => {
    expect(splitCompanyExpenseAmount(11_000, 10)).toEqual({
      amountWithoutVat: 10_000,
      vatAmount: 1_000,
      amountWithVat: 11_000,
    });
  });

  it('puts the whole amount in net when the rate is 0%', () => {
    expect(splitCompanyExpenseAmount(8_000, 0)).toEqual({
      amountWithoutVat: 8_000,
      vatAmount: 0,
      amountWithVat: 8_000,
    });
  });
});

describe('inferCompanyExpenseVatRate', () => {
  it('recovers the rate from stored amounts', () => {
    expect(
      inferCompanyExpenseVatRate({
        amountWithoutVat: 10_000,
        vatAmount: 2_000,
        amountWithVat: 12_000,
      }),
    ).toBe(20);
    expect(
      inferCompanyExpenseVatRate({
        amountWithoutVat: 10_000,
        vatAmount: 1_000,
        amountWithVat: 11_000,
      }),
    ).toBe(10);
    expect(
      inferCompanyExpenseVatRate({
        amountWithoutVat: 8_000,
        vatAmount: 0,
        amountWithVat: 8_000,
      }),
    ).toBe(0);
  });
});
