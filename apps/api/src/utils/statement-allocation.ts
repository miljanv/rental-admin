import type { SettlementTargetType } from '@rental-admin/shared';

export interface StatementAllocationTarget {
  targetType: SettlementTargetType;
  targetId: string;
  reference: string | null;
  issuedAt: Date;
  remainingAmount: number;
}

const referenceKey = (value: string): string => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

const digitGroups = (value: string): string[] => value.match(/\d+/g) ?? [];

const isYear = (group: string): boolean => /^20\d{2}$/.test(group);

/**
 * Banks rewrite invoice numbers in the payment reference: "358-2026" arrives as
 * "26-RN002000358". The invoice's own number must end a zero-padded digit group
 * of the reference, and its year (if any) must appear as "2026" or "26".
 */
export const looseReferenceMatch = (
  invoiceReference: string,
  paymentReference: string,
): boolean => {
  const invoiceGroups = digitGroups(invoiceReference);
  const numbers = invoiceGroups
    .filter((group) => !isYear(group))
    .map((group) => group.replace(/^0+/, ''))
    .filter((group) => group.length > 0);
  if (numbers.length === 0) return false;
  const paymentGroups = digitGroups(paymentReference).map((group) => group.replace(/^0+/, ''));
  const year = invoiceGroups.find(isYear);
  if (year && !paymentGroups.some((group) => group === year || group === year.slice(2))) {
    return false;
  }
  return numbers.every((number) =>
    paymentGroups.some((group) => group === number || group.endsWith(`0${number}`)),
  );
};

const amountCents = (value: number): number => Math.round(value * 100);

/** The referenced invoice only: exact, one word of it, then the bank-padded form. Never by amount. */
const referencedTargets = (
  open: StatementAllocationTarget[],
  reference: string,
): StatementAllocationTarget[] => {
  const key = referenceKey(reference);
  const exact = open.filter((target) => target.reference && referenceKey(target.reference) === key);
  if (exact.length > 0) return exact.length === 1 ? exact : [];
  // "R-0770/26 MP1": the bank appends its own word after the invoice number.
  const words = reference.split(/\s+/).map(referenceKey).filter(Boolean);
  const byWord = open.filter(
    (target) => target.reference && words.includes(referenceKey(target.reference)),
  );
  if (byWord.length > 0) return byWord.length === 1 ? byWord : [];
  const loose = open.filter(
    (target) => target.reference && looseReferenceMatch(target.reference, reference),
  );
  return loose.length === 1 ? loose : [];
};

/** An explicit reference must never silently pay a different invoice. */
export const planStatementAllocations = (
  available: number,
  targets: StatementAllocationTarget[],
  reference: string | null,
): Array<StatementAllocationTarget & { amount: number }> => {
  const open = targets.filter((target) => target.remainingAmount > 0.005);
  const candidates =
    reference && referenceKey(reference) ? referencedTargets(open, reference) : open;
  candidates.sort(
    (left, right) =>
      left.issuedAt.getTime() - right.issuedAt.getTime() ||
      left.targetId.localeCompare(right.targetId),
  );
  const allocations: Array<StatementAllocationTarget & { amount: number }> = [];
  let cents = amountCents(available);
  for (const target of candidates) {
    const amount = Math.min(cents, amountCents(target.remainingAmount));
    if (amount <= 0) break;
    allocations.push({ ...target, amount: amount / 100 });
    cents -= amount;
  }
  return allocations;
};
