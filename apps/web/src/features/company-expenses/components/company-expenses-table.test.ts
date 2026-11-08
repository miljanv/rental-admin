import type { CompanyExpenseDto } from '@rental-admin/shared';
import { describe, expect, it } from 'vitest';

import { groupedBySupplyMonth } from './company-expenses-table';

const expense = (overrides: Partial<CompanyExpenseDto>): CompanyExpenseDto =>
  ({
    id: 'e',
    issuedAt: '2026-11-04',
    supplyDate: '2026-10-31',
    amountWithoutVat: 100,
    vatAmount: 20,
    amountWithVat: 120,
    ...overrides,
  }) as CompanyExpenseDto;

describe('groupedBySupplyMonth', () => {
  it('groups by supply month, newest first, with subtotals', () => {
    const rows = groupedBySupplyMonth([
      expense({ id: 'oct-1' }),
      expense({ id: 'nov-1', issuedAt: '2026-11-06', supplyDate: '2026-11-02' }),
      expense({ id: 'oct-2', amountWithoutVat: 50, vatAmount: 10, amountWithVat: 60 }),
    ]);

    expect(rows.map((row) => (row.type === 'group' ? row.key : row.expense.id))).toEqual([
      '2026-11',
      'nov-1',
      '2026-10',
      'oct-1',
      'oct-2',
    ]);
    expect(rows[2]).toMatchObject({
      type: 'group',
      count: 2,
      withoutVat: 150,
      vat: 30,
      total: 180,
    });
  });

  it('puts a bill without a supply date in the month of its invoice date', () => {
    const rows = groupedBySupplyMonth([
      expense({ id: 'old', supplyDate: null, issuedAt: '2026-09-15' }),
    ]);

    expect(rows[0]).toMatchObject({ type: 'group', key: '2026-09', count: 1 });
  });
});
