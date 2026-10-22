import { createHash } from 'node:crypto';
import type {
  AllocationPlanDto,
  AllocationPlanRequest,
  ConfirmAllocationPlanRequest,
  LinkCounterpartyRequest,
  PaymentAllocationsDto,
  TransactionDto,
} from '@rental-admin/shared';
import { prisma, type TransactionClient } from '../config/prisma';
import { badRequest, conflict, notFound } from '../utils/app-error';
import { assertAfterOpeningCutover } from '../utils/opening-cutover';
import { financeWrite } from '../utils/finance-write';
import { recordFinanceAudit } from '../utils/finance-audit';
import { canonicalBankAccount } from '../utils/statement-matching';
import { planStatementAllocations } from '../utils/statement-allocation';
import { requireOrganizationId } from '../utils/tenant-context';
import { toTransactionDto } from '../utils/transaction-mapper';
import { requireCounterparty } from './opening-balance.service';
import {
  applyPaymentAllocation,
  getSettlementTarget,
  loadStatementAllocationTargets,
  refreshTargetPaidAt,
  toPaymentAllocationDto,
  transactionInclude,
} from './transaction.service';

const round = (value: number): number => Math.round(value * 100) / 100;
const getPayment = async (tx: TransactionClient, id: string) => {
  const record = await tx.financeTransaction.findUnique({
    where: { id },
    include: transactionInclude,
  });
  if (!record) throw notFound('Uplata nije pronađena.');
  if (
    record.paymentMethod !== 'ACCOUNT' ||
    !['MANUAL', 'BANK_STATEMENT', 'OPENING_BALANCE'].includes(record.sourceType)
  )
    throw conflict('Ovaj zapis nije uplata dostupna za raspoređivanje.');
  return record;
};

export const linkPaymentCounterparty = async (
  id: string,
  input: LinkCounterpartyRequest,
): Promise<TransactionDto> =>
  financeWrite(async (tx) => {
    const payment = await getPayment(tx, id);
    if (payment.sourceType === 'OPENING_BALANCE')
      throw conflict('Stranka početnog stanja ne može da se menja.');
    if ((payment.type === 'INCOME') !== (input.partyType === 'PARTNER'))
      throw badRequest('Stranka ne odgovara smeru uplate.');
    const previousId = payment.type === 'INCOME' ? payment.partnerId : payment.supplierId;
    if (payment.paymentAllocations.length && previousId !== input.partyId)
      throw conflict('Prvo poništite postojeća povezivanja sa računima.');
    const name = await requireCounterparty(tx, input);
    await assertAfterOpeningCutover(tx, {
      occurredAt: payment.occurredAt,
      ...(input.partyType === 'PARTNER'
        ? { partnerId: input.partyId }
        : { supplierId: input.partyId }),
    });
    if (input.rememberAccount) {
      const accountNumber = payment.note?.match(/(?:^| · )Račun ([^·]+)/)?.[1]?.trim();
      if (!accountNumber)
        throw badRequest('Stavka izvoda nema bankovni račun koji može da se zapamti.');
      if (input.partyType === 'PARTNER') {
        const accounts = await tx.partnerBankAccount.findMany();
        const matches = accounts.filter(
          (row) => canonicalBankAccount(row.accountNumber) === canonicalBankAccount(accountNumber),
        );
        if (matches.some((row) => row.partnerId !== input.partyId))
          throw conflict('Bankovni račun je već povezan sa drugim kupcem.');
        if (!matches.length)
          await tx.partnerBankAccount.create({
            data: {
              organizationId: requireOrganizationId(),
              partnerId: input.partyId,
              accountNumber,
            },
          });
      } else {
        const accounts = await tx.supplierBankAccount.findMany();
        const matches = accounts.filter(
          (row) => canonicalBankAccount(row.accountNumber) === canonicalBankAccount(accountNumber),
        );
        if (matches.some((row) => row.supplierId !== input.partyId))
          throw conflict('Bankovni račun je već povezan sa drugim dobavljačem.');
        if (!matches.length)
          await tx.supplierBankAccount.create({
            data: {
              organizationId: requireOrganizationId(),
              supplierId: input.partyId,
              accountNumber,
            },
          });
      }
    }
    const updated = await tx.financeTransaction.update({
      where: { id },
      data:
        payment.type === 'INCOME'
          ? { partnerId: input.partyId, partner: name }
          : { supplierId: input.partyId, supplier: name },
      include: transactionInclude,
    });
    await recordFinanceAudit(tx, id, 'COUNTERPARTY_LINKED', { previousId, ...input });
    // Linking the owner of a payment does not allocate it or create another payment.
    return toTransactionDto(updated);
  });

const buildPlan = async (
  tx: TransactionClient,
  id: string,
  input: AllocationPlanRequest,
): Promise<AllocationPlanDto> => {
  const payment = await getPayment(tx, id);
  if (payment.type === 'INCOME' ? !payment.partnerId : !payment.supplierId)
    throw conflict('Prvo izaberite kupca ili dobavljača.');
  const availableAmount = toTransactionDto(payment).unallocatedAmount;
  // Explicit allocation can use an older prepayment against a later invoice.
  const targets = await loadStatementAllocationTargets(tx, { ...payment, occurredAt: new Date() });
  const reference = payment.note?.match(/(?:^| · )Poziv ([^·]+)/)?.[1]?.trim() ?? null;
  const eligible = targets.filter(
    (target) => target.targetType !== 'OPENING_BALANCE' || target.issuedAt < payment.occurredAt,
  );
  const plan = planStatementAllocations(
    availableAmount,
    eligible,
    input.ignoreReference ? null : reference,
  );
  const allocations: AllocationPlanDto['allocations'] = [];
  for (const row of plan)
    allocations.push({
      ...(await getSettlementTarget(row.targetType, row.targetId, tx)),
      amount: row.amount,
    });
  const allocatedAmount = round(allocations.reduce((sum, row) => sum + row.amount, 0));
  const snapshot = {
    paymentId: id,
    owner: [payment.partnerId, payment.supplierId],
    availableAmount,
    reference,
    ignoreReference: input.ignoreReference,
    allocations,
  };
  return {
    token: createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'),
    reference,
    ignoreReference: input.ignoreReference,
    availableAmount,
    allocatedAmount,
    remainingAmount: round(availableAmount - allocatedAmount),
    allocations,
  };
};

export const previewPaymentAllocation = async (
  id: string,
  input: AllocationPlanRequest,
): Promise<AllocationPlanDto> => buildPlan(prisma, id, input);

export const confirmPaymentAllocation = async (
  id: string,
  input: ConfirmAllocationPlanRequest,
): Promise<TransactionDto> =>
  financeWrite(async (tx) => {
    const plan = await buildPlan(tx, id, input);
    if (plan.token !== input.token)
      throw conflict('Dugovanja ili uplata su promenjeni. Osvežite i ponovo potvrdite predlog.');
    if (!plan.allocations.length) throw conflict('Nema stavki za raspoređivanje.');
    for (const row of plan.allocations)
      await applyPaymentAllocation(tx, id, {
        targetType: row.targetType,
        targetId: row.targetId,
        amount: row.amount,
        note: input.ignoreReference
          ? 'Po starosti, uz potvrđeno zanemarivanje poziva na broj'
          : 'Potvrđen raspored po starosti',
      });
    await recordFinanceAudit(tx, id, 'ALLOCATION_PLAN_CONFIRMED', plan);
    return toTransactionDto(
      await tx.financeTransaction.findUniqueOrThrow({ where: { id }, include: transactionInclude }),
    );
  });

export const listPaymentAllocations = async (id: string): Promise<PaymentAllocationsDto> => {
  await getPayment(prisma, id);
  const [records, events] = await Promise.all([
    prisma.paymentAllocation.findMany({
      where: { transactionId: id },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.financeAuditEvent.findMany({
      where: { entityId: id },
      include: { actor: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);
  const allocations: PaymentAllocationsDto['allocations'] = [];
  for (const row of records)
    allocations.push({
      ...toPaymentAllocationDto(row),
      label: (await getSettlementTarget(row.targetType, row.targetId)).label,
    });
  return {
    allocations,
    history: events.map((event) => ({
      id: event.id,
      action: event.action,
      reason: event.reason,
      actor: event.actor?.username ?? null,
      createdAt: event.createdAt.toISOString(),
    })),
  };
};

export const reversePaymentAllocation = async (
  id: string,
  allocationId: string,
  reason: string,
): Promise<TransactionDto> =>
  financeWrite(async (tx) => {
    const payment = await getPayment(tx, id);
    const allocation = await tx.paymentAllocation.findFirst({
      where: { id: allocationId, transactionId: id },
    });
    if (!allocation) throw notFound('Povezivanje nije pronađeno.');
    await recordFinanceAudit(tx, id, 'ALLOCATION_REVERSED', allocation, reason);
    await tx.paymentAllocation.delete({ where: { id: allocationId } });
    await refreshTargetPaidAt(allocation.targetType, allocation.targetId, payment.occurredAt, tx);
    return toTransactionDto(
      await tx.financeTransaction.findUniqueOrThrow({ where: { id }, include: transactionInclude }),
    );
  });
