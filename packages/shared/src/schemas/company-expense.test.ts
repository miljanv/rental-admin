import { describe, expect, it } from 'vitest';

import {
  companyExpenseSummaryQuerySchema,
  listCompanyExpensesQuerySchema,
} from './company-expense';

describe('company expense period date', () => {
  it('filters by invoice date unless the supply date is asked for', () => {
    expect(listCompanyExpensesQuerySchema.parse({}).dateField).toBe('issuedAt');
    expect(companyExpenseSummaryQuerySchema.parse({}).dateField).toBe('issuedAt');
  });

  it('accepts sorting and filtering by supply date', () => {
    const result = listCompanyExpensesQuerySchema.parse({
      dateField: 'supplyDate',
      sortBy: 'supplyDate',
      from: '2026-10-01',
      to: '2026-10-31',
    });

    expect(result).toMatchObject({ dateField: 'supplyDate', sortBy: 'supplyDate' });
  });

  it('rejects an unknown date field', () => {
    expect(listCompanyExpensesQuerySchema.safeParse({ dateField: 'paidAt' }).success).toBe(false);
  });
});
