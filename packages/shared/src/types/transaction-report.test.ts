import { describe, expect, it } from 'vitest';

import { buildFinanceReport, defaultFinanceReportRange, type FinanceReportRow } from './transaction-report';

const row = (
  overrides: Partial<FinanceReportRow> & Pick<FinanceReportRow, 'type' | 'amount' | 'occurredAt'>,
): FinanceReportRow => ({
  category: 'OTHER',
  paymentMethod: 'ACCOUNT',
  vehicle: null,
  partner: null,
  route: null,
  ...overrides,
});

describe('defaultFinanceReportRange', () => {
  it('covers the last 12 months through today in UTC', () => {
    expect(defaultFinanceReportRange(new Date('2026-08-15T10:00:00.000Z'))).toEqual({
      from: '2025-09-01',
      to: '2026-08-15',
    });
  });
});

describe('buildFinanceReport', () => {
  it('splits income and expense, including cash vs account', () => {
    const report = buildFinanceReport(
      [
        row({
          type: 'INCOME',
          category: 'CONTRACT',
          amount: 100_000,
          occurredAt: '2026-08-10',
          paymentMethod: 'CASH',
          partner: 'Turist d.o.o.',
          route: 'NS–BG',
        }),
        row({
          type: 'EXPENSE',
          category: 'FUEL',
          amount: 40_000,
          occurredAt: '2026-08-12',
          paymentMethod: 'ACCOUNT',
        }),
      ],
      '2026-08-01',
      '2026-08-31',
    );

    expect(report.totals).toMatchObject({ income: 100_000, expense: 40_000, profit: 60_000, count: 2 });
    expect(report.byPaymentMethod.find((item) => item.paymentMethod === 'CASH')?.income).toBe(100_000);
    expect(report.byPaymentMethod.find((item) => item.paymentMethod === 'ACCOUNT')?.expense).toBe(
      40_000,
    );
    expect(report.byCategory).toEqual([{ category: 'FUEL', expense: 40_000, count: 1 }]);
    expect(report.byPartner[0]).toMatchObject({
      partner: 'Turist d.o.o.',
      income: 100_000,
      profit: 100_000,
    });
    expect(report.byRoute[0]).toMatchObject({ route: 'NS–BG', income: 100_000, profit: 100_000 });
  });

  it('fills empty months in the requested range', () => {
    const report = buildFinanceReport(
      [row({ type: 'INCOME', amount: 1, occurredAt: '2026-07-15' })],
      '2026-06-01',
      '2026-08-31',
    );

    expect(report.monthly.map((point) => `${point.year}-${point.month}`)).toEqual([
      '2026-6',
      '2026-7',
      '2026-8',
    ]);
    expect(report.monthly[1]?.income).toBe(1);
    expect(report.monthly[0]?.income).toBe(0);
  });

  it('groups untagged rows as Bez partnera / Bez relacije', () => {
    const report = buildFinanceReport(
      [row({ type: 'EXPENSE', amount: 500, occurredAt: '2026-08-01' })],
      '2026-08-01',
      '2026-08-01',
    );

    expect(report.byPartner[0]?.partner).toBe('Bez partnera');
    expect(report.byRoute[0]?.route).toBe('Bez relacije');
    expect(report.byVehicle[0]?.vehicle).toBeNull();
  });
});
