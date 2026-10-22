import { describe, expect, it } from 'vitest';
import {
  openingBalanceWriteSchema,
  openingBalanceConfirmSchema,
  financeReasonSchema,
  confirmAllocationPlanSchema,
} from './finance-settlement';
const draft = {
  partyType: 'SUPPLIER',
  partyId: 's-1',
  kind: 'DEBT',
  amount: 2300,
  asOfDate: '2026-01-01',
};
describe('opening balances and allocation confirmation', () => {
  it('accepts debt and existing credit with cent precision', () => {
    expect(openingBalanceWriteSchema.parse(draft).amount).toBe(2300);
    expect(openingBalanceWriteSchema.parse({ ...draft, kind: 'CREDIT', amount: 25.01 }).kind).toBe(
      'CREDIT',
    );
  });
  it.each([0, -1, 1.001, Number.NaN, Number.POSITIVE_INFINITY, 1_000_000_001])(
    'rejects an invalid monetary amount %s',
    (amount) => {
      expect(openingBalanceWriteSchema.safeParse({ ...draft, amount }).success).toBe(false);
    },
  );
  it('requires explicit confirmation and a reason for corrections', () => {
    expect(openingBalanceConfirmSchema.safeParse({}).success).toBe(false);
    expect(
      openingBalanceConfirmSchema.safeParse({ acknowledgeUnrecordedBalance: true }).success,
    ).toBe(true);
    expect(financeReasonSchema.safeParse({ reason: '  ' }).success).toBe(false);
    expect(confirmAllocationPlanSchema.safeParse({ ignoreReference: true }).success).toBe(false);
  });
});
