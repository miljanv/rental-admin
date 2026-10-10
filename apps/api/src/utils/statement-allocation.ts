import type { SettlementTargetType } from '@rental-admin/shared';

export interface StatementAllocationTarget {
  targetType: SettlementTargetType;
  targetId: string;
  reference: string | null;
  issuedAt: Date;
  remainingAmount: number;
}

const referenceKey = (value: string): string => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

/** An explicit reference must never silently pay a different invoice. */
export const planStatementAllocations = (
  available: number,
  targets: StatementAllocationTarget[],
  reference: string | null,
): Array<StatementAllocationTarget & { amount: number }> => {
  const key = reference ? referenceKey(reference) : '';
  const open = targets.filter((target) => target.remainingAmount > 0.005);
  const candidates = key
    ? open.filter((target) => target.reference && referenceKey(target.reference) === key)
    : open;
  if (key && candidates.length !== 1) return [];
  candidates.sort(
    (left, right) =>
      left.issuedAt.getTime() - right.issuedAt.getTime() ||
      left.targetId.localeCompare(right.targetId),
  );
  const allocations: Array<StatementAllocationTarget & { amount: number }> = [];
  let cents = Math.round(available * 100);
  for (const target of candidates) {
    const amount = Math.min(cents, Math.round(target.remainingAmount * 100));
    if (amount <= 0) break;
    allocations.push({ ...target, amount: amount / 100 });
    cents -= amount;
  }
  return allocations;
};
