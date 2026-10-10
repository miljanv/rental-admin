import { describe, expect, it } from 'vitest';

import { toCompanyExpenseWriteRequest } from './company-expense-form-schema';

const base = {
  issuedAt: '2026-09-26',
  invoiceNumber: 'R-1',
  supplier: 'Auto delovi',
  description: 'Filter ulja',
  paymentMethod: 'CASH' as const,
  scope: 'COMMON' as const,
  vehicleId: '',
  odometerKm: null,
};

describe('toCompanyExpenseWriteRequest', () => {
  it('splits a 20% amount into net and VAT', () => {
    expect(toCompanyExpenseWriteRequest({ ...base, amount: 12_000, vatRate: 20 })).toMatchObject({
      amountWithoutVat: 10_000,
      vatAmount: 2_000,
      amountWithVat: 12_000,
    });
  });

  it('accepts 0% VAT', () => {
    expect(toCompanyExpenseWriteRequest({ ...base, amount: 5_000, vatRate: 0 })).toMatchObject({
      amountWithoutVat: 5_000,
      vatAmount: 0,
      amountWithVat: 5_000,
    });
  });

  it('keeps subcontractor and bank costs separate from shared costs', () => {
    expect(
      toCompanyExpenseWriteRequest({ ...base, scope: 'SUBCONTRACTOR', amount: 50_000, vatRate: 0 }),
    ).toMatchObject({ scope: 'SUBCONTRACTOR', vehicleId: null, odometerKm: null });
    expect(
      toCompanyExpenseWriteRequest({ ...base, scope: 'BANK', amount: 500, vatRate: 0 }),
    ).toMatchObject({ scope: 'BANK', vehicleId: null, odometerKm: null });
  });
});
