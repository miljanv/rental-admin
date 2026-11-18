import { describe, expect, it } from 'vitest';

import {
  looseReferenceMatch,
  planStatementAllocations,
  type StatementAllocationTarget,
} from './statement-allocation';

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
  it('matches a bank-rewritten reference to the invoice number and year', () => {
    expect(looseReferenceMatch('358-2026', '26-RN002000358')).toBe(true);
    expect(looseReferenceMatch('358-2026', '2026-0000358')).toBe(true);
    expect(looseReferenceMatch('358-2026', '25-RN002000358')).toBe(false);
    expect(looseReferenceMatch('58-2026', '26-RN002000358')).toBe(false);
    expect(looseReferenceMatch('1358-2026', '26-RN002000358')).toBe(false);
    expect(looseReferenceMatch('RN', '26-RN002000358')).toBe(false);
  });
  it('settles the invoice whose number the bank padded in the reference', () => {
    const plan = planStatementAllocations(
      773_630,
      [
        invoice('other', 773_630, '2026-10-01', '357-2026'),
        invoice('viva', 773_630, '2026-10-08', '358-2026'),
      ],
      '26-RN002000358',
    );
    expect(plan).toEqual([expect.objectContaining({ targetId: 'viva', amount: 773_630 })]);
  });
  it('matches the references Promont and Sigmatic actually pay with', () => {
    const promont = ['16-2026', '32-2026', '269-2026', '379-2026', '380-2026', '383-2026'];
    for (const [reference, expected] of [
      ['26-RN002000379', '379-2026'],
      ['26-RN002000380', '380-2026'],
      ['26-RN002000383', '383-2026'],
    ] as const) {
      expect(
        promont.filter((invoiceReference) => looseReferenceMatch(invoiceReference, reference)),
      ).toEqual([expected]);
    }
    const sigmatic = [
      invoice('0755', 135_250, '2026-10-21', 'R-0755/26'),
      invoice('0769', 64_150, '2026-11-02', 'R-0769/26'),
      invoice('0770', 12_470, '2026-11-02', 'R-0770/26'),
      invoice('0771', 60_500, '2026-11-02', 'R-0771/26'),
    ];
    expect(planStatementAllocations(12_470, sigmatic, 'R-0770/26 MP1')).toEqual([
      expect.objectContaining({ targetId: '0770', amount: 12_470 }),
    ]);
  });
  it('still refuses a reference that names no open invoice, even at the same amount', () => {
    const targets = [invoice('a', 500, '2026-10-01', 'X-1'), invoice('b', 773_630, '2026-10-02')];
    expect(planStatementAllocations(773_630, targets, 'unrelated 97')).toEqual([]);
  });
});
