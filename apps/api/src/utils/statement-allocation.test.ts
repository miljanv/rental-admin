import { describe, expect, it } from 'vitest';

import { planStatementAllocations, type StatementAllocationTarget } from './statement-allocation';

const invoice = (
  targetId: string,
  remainingAmount: number,
  issuedAt: string,
  reference: string | null = null,
): StatementAllocationTarget => ({
  targetType: 'COMPANY_EXPENSE',
  targetId,
  remainingAmount,
  issuedAt: new Date(issuedAt),
  reference,
});

describe('statement allocation policy', () => {
  it('settles oldest invoices first and preserves the overpayment', () => {
    const plan = planStatementAllocations(
      150,
      [invoice('new', 50, '2026-10-02'), invoice('old', 80, '2026-10-01')],
      null,
    );
    expect(plan.map(({ targetId, amount }) => ({ targetId, amount }))).toEqual([
      { targetId: 'old', amount: 80 },
      { targetId: 'new', amount: 50 },
    ]);
    expect(150 - plan.reduce((sum, item) => sum + item.amount, 0)).toBe(20);
  });
  it('records partial payments to the cent', () => {
    expect(
      planStatementAllocations(
        100.01,
        [invoice('a', 70.02, '2026-10-01'), invoice('b', 50, '2026-10-02')],
        null,
      ).map((item) => item.amount),
    ).toEqual([70.02, 29.99]);
  });
  it('prioritizes an explicit reference over FIFO and leaves its excess unassigned', () => {
    const plan = planStatementAllocations(
      100,
      [invoice('old', 90, '2026-10-01', '1/26'), invoice('chosen', 40, '2026-10-02', '2/26')],
      '2-26',
    );
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ targetId: 'chosen', amount: 40 });
  });
  it('keeps unknown or ambiguous references for manual review', () => {
    const targets = [
      invoice('a', 100, '2026-10-01', '123'),
      invoice('b', 100, '2026-10-02', '123'),
    ];
    expect(planStatementAllocations(100, targets, 'unknown')).toEqual([]);
    expect(planStatementAllocations(100, targets, '123')).toEqual([]);
  });
  it('does not allocate settled invoices or zero available funds', () => {
    expect(planStatementAllocations(100, [invoice('a', 0, '2026-10-01')], null)).toEqual([]);
    expect(planStatementAllocations(0, [invoice('a', 100, '2026-10-01')], null)).toEqual([]);
  });
});
