import {
  partnerSelectLabel,
  type CounterpartyRequest,
  type OpeningBalanceDto,
  type OpeningBalanceWriteRequest,
} from '@rental-admin/shared';
import { prisma, type TransactionClient } from '../config/prisma';
import { badRequest, conflict, notFound } from '../utils/app-error';
import { financeWrite } from '../utils/finance-write';
import { recordFinanceAudit } from '../utils/finance-audit';
import { getTenantContext, requireOrganizationId } from '../utils/tenant-context';
import { toTransactionDto } from '../utils/transaction-mapper';

export const openingPartyWhere = (
  party: CounterpartyRequest,
): { partnerId: string } | { supplierId: string } =>
  party.partyType === 'PARTNER' ? { partnerId: party.partyId } : { supplierId: party.partyId };

export const requireCounterparty = async (
  tx: TransactionClient,
  party: CounterpartyRequest,
): Promise<string> => {
  if (party.partyType === 'PARTNER') {
    const record = await tx.partner.findUnique({ where: { id: party.partyId } });
    if (!record) throw notFound('Kupac nije pronađen.');
    return partnerSelectLabel(record);
  }
  const record = await tx.supplier.findUnique({ where: { id: party.partyId } });
  if (!record) throw notFound('Dobavljač nije pronađen.');
  return record.name;
};

export const listOpeningBalances = async (
  party: CounterpartyRequest,
): Promise<OpeningBalanceDto[]> => {
  await requireCounterparty(prisma, party);
  const records = await prisma.openingBalance.findMany({
    where: openingPartyWhere(party),
    orderBy: { createdAt: 'desc' },
  });
  const ids = records.map((record) => record.id);
  const [allocated, credits, payments, history] = await Promise.all([
    prisma.paymentAllocation.groupBy({
      by: ['targetId'],
      where: { targetType: 'OPENING_BALANCE', targetId: { in: ids } },
      _sum: { amount: true },
    }),
    prisma.financeTransaction.findMany({
      where: { sourceType: 'OPENING_BALANCE', sourceId: { in: ids } },
      include: { vehicle: true, driver: true, paymentAllocations: true },
    }),
    prisma.paymentAllocation.findMany({
      where: { targetType: 'OPENING_BALANCE', targetId: { in: ids } },
      include: {
        transaction: { include: { vehicle: true, driver: true, paymentAllocations: true } },
      },
    }),
    prisma.financeAuditEvent.findMany({
      where: { entityId: { in: ids } },
      include: { actor: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return records.map((record) => {
    const credit = credits.find((row) => row.sourceId === record.id);
    const allocatedAmount =
      Math.round(
        (record.kind === 'DEBT'
          ? (allocated.find((row) => row.targetId === record.id)?._sum.amount ?? 0)
          : (credit?.paymentAllocations.reduce((sum, item) => sum + item.amount, 0) ?? 0)) * 100,
      ) / 100;
    return {
      id: record.id,
      ...party,
      kind: record.kind,
      amount: record.amount,
      asOfDate: record.asOfDate.toISOString().slice(0, 10),
      note: record.note,
      status: record.status,
      confirmedAt: record.confirmedAt?.toISOString() ?? null,
      confirmedById: record.confirmedById,
      reversedAt: record.reversedAt?.toISOString() ?? null,
      reversedById: record.reversedById,
      reversalReason: record.reversalReason,
      allocatedAmount,
      remainingAmount:
        record.status === 'REVERSED'
          ? 0
          : Math.max(0, Math.round((record.amount - allocatedAmount) * 100) / 100),
      creditTransaction: credit && record.status === 'CONFIRMED' ? toTransactionDto(credit) : null,
      payments: payments
        .filter((row) => row.targetId === record.id)
        .map((row) => toTransactionDto(row.transaction)),
      history: history
        .filter((event) => event.entityId === record.id)
        .map((event) => ({
          id: event.id,
          action: event.action,
          reason: event.reason,
          actor: event.actor?.username ?? null,
          createdAt: event.createdAt.toISOString(),
        })),
    };
  });
};

export const saveOpeningBalance = async (
  input: OpeningBalanceWriteRequest,
  id?: string,
): Promise<{ id: string }> =>
  financeWrite(async (tx) => {
    await requireCounterparty(tx, input);
    if (input.asOfDate > new Date().toISOString().slice(0, 10))
      throw badRequest('Početno stanje ne može biti u budućnosti.');
    const data = {
      partnerId: input.partyType === 'PARTNER' ? input.partyId : null,
      supplierId: input.partyType === 'SUPPLIER' ? input.partyId : null,
      activeKey: `${input.partyType}:${input.partyId}`,
      kind: input.kind,
      amount: input.amount,
      asOfDate: new Date(`${input.asOfDate}T00:00:00Z`),
      note: input.note || null,
    };
    if (id) {
      const previous = await tx.openingBalance.findUnique({ where: { id } });
      if (!previous) throw notFound('Početno stanje nije pronađeno.');
      if (previous.status !== 'DRAFT')
        throw conflict('Potvrđeno stanje se ne menja. Prvo stornirajte zapis uz razlog.');
      if (previous.partnerId !== data.partnerId || previous.supplierId !== data.supplierId)
        throw conflict('Nije dozvoljena promena stranke početnog stanja.');
      await tx.openingBalance.update({ where: { id }, data });
      await recordFinanceAudit(tx, id, 'OPENING_DRAFT_UPDATED', { before: previous, after: data });
      return { id };
    }
    const existing = await tx.openingBalance.findFirst({ where: { activeKey: data.activeKey } });
    if (existing) throw conflict('Za ovu stranku već postoji nacrt ili potvrđeno početno stanje.');
    const record = await tx.openingBalance.create({
      data: { ...data, organizationId: requireOrganizationId() },
    });
    await recordFinanceAudit(tx, record.id, 'OPENING_DRAFT_CREATED', record);
    return { id: record.id };
  });

export const confirmOpeningBalance = async (id: string): Promise<{ id: string }> =>
  financeWrite(async (tx) => {
    const record = await tx.openingBalance.findUnique({ where: { id } });
    if (!record) throw notFound('Početno stanje nije pronađeno.');
    if (record.status !== 'DRAFT') throw conflict('Samo nacrt može da se potvrdi.');
    const party: CounterpartyRequest = record.partnerId
      ? { partyType: 'PARTNER', partyId: record.partnerId }
      : { partyType: 'SUPPLIER', partyId: record.supplierId! };
    const name = await requireCounterparty(tx, party);
    // Opening balances cover the period through the cutover date. Reject overlap,
    // rather than silently hiding or counting previously recorded documents twice.
    const priorPayments = await tx.financeTransaction.count({
      where: {
        ...openingPartyWhere(party),
        sourceType: { in: ['MANUAL', 'BANK_STATEMENT'] },
        paymentMethod: 'ACCOUNT',
        occurredAt: { lte: record.asOfDate },
      },
    });
    const priorDocuments =
      party.partyType === 'PARTNER'
        ? await tx.trip.count({
            where: {
              partnerId: party.partyId,
              invoicedAt: { not: null, lte: record.asOfDate },
              paymentMethod: 'ACCOUNT',
            },
          })
        : await tx.companyExpense.count({
            where: {
              supplierId: party.partyId,
              issuedAt: { lte: record.asOfDate },
              paymentMethod: 'ACCOUNT',
            },
          });
    const priorOperationalCosts =
      party.partyType === 'SUPPLIER'
        ? await Promise.all([
            tx.fuelLog.count({
              where: {
                supplierId: party.partyId,
                paymentMethod: 'ACCOUNT',
                cost: { not: null },
                fueledAt: { lte: record.asOfDate },
              },
            }),
            tx.vehicleMaintenance.count({
              where: {
                supplierId: party.partyId,
                paymentMethod: 'ACCOUNT',
                date: { lte: record.asOfDate },
              },
            }),
          ])
        : [];
    if (priorPayments || priorDocuments || priorOperationalCosts.some((count) => count > 0))
      throw conflict(
        'Pre datuma preseka već postoje evidentirani računi ili uplate ove stranke. Uskladite datum i podatke da dug ne bude unet dvaput.',
      );
    if (record.kind === 'CREDIT') {
      await tx.financeTransaction.create({
        data: {
          organizationId: requireOrganizationId(),
          sourceType: 'OPENING_BALANCE',
          sourceId: id,
          type: party.partyType === 'PARTNER' ? 'INCOME' : 'EXPENSE',
          category: 'OTHER',
          amount: record.amount,
          occurredAt: record.asOfDate,
          paymentMethod: 'ACCOUNT',
          status: 'SETTLED',
          partnerId: record.partnerId,
          supplierId: record.supplierId,
          partner: record.partnerId ? name : null,
          supplier: record.supplierId ? name : null,
          note: 'Preneta pretplata iz početnog stanja',
        },
      });
    }
    await tx.openingBalance.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        confirmedById: getTenantContext()?.userId ?? null,
      },
    });
    await recordFinanceAudit(tx, id, 'OPENING_CONFIRMED', record);
    return { id };
  });

export const reverseOpeningBalance = async (id: string, reason: string): Promise<{ id: string }> =>
  financeWrite(async (tx) => {
    const record = await tx.openingBalance.findUnique({ where: { id } });
    if (!record) throw notFound('Početno stanje nije pronađeno.');
    if (record.status !== 'CONFIRMED') throw conflict('Samo potvrđeno stanje može da se stornira.');
    const credits = await tx.financeTransaction.findMany({
      where: { sourceType: 'OPENING_BALANCE', sourceId: id },
    });
    const count = await tx.paymentAllocation.count({
      where: {
        OR: [
          { targetType: 'OPENING_BALANCE', targetId: id },
          { transactionId: { in: credits.map((row) => row.id) } },
        ],
      },
    });
    if (count) throw conflict('Prvo poništite povezivanja uplata sa ovim stanjem.');
    await tx.financeTransaction.updateMany({
      where: { sourceType: 'OPENING_BALANCE', sourceId: id },
      data: { amount: 0 },
    });
    await tx.openingBalance.update({
      where: { id },
      data: {
        status: 'REVERSED',
        activeKey: null,
        reversedAt: new Date(),
        reversedById: getTenantContext()?.userId ?? null,
        reversalReason: reason,
      },
    });
    await recordFinanceAudit(tx, id, 'OPENING_REVERSED', record, reason);
    return { id };
  });

export const openingLedgerEntries = async (party: CounterpartyRequest) => {
  const records = await prisma.openingBalance.findMany({
    where: { ...openingPartyWhere(party), status: { in: ['CONFIRMED', 'REVERSED'] } },
    orderBy: { asOfDate: 'asc' },
  });
  return records.flatMap((record) => {
    const entry = {
      id: `opening:${record.id}`,
      postedAt: record.asOfDate,
      sourceId: record.id,
      documentNumber: null,
      description: record.note || 'Preneto početno stanje',
      debit: record.kind === 'DEBT' ? record.amount : 0,
      credit: record.kind === 'CREDIT' ? record.amount : 0,
    };
    // A correction reverses the original opening entry at its cutover date;
    // its real timestamp, actor and reason remain in the immutable audit trail.
    return record.status === 'REVERSED'
      ? [
          entry,
          {
            ...entry,
            id: `opening-reversal:${record.id}`,
            debit: -entry.debit,
            credit: -entry.credit,
            description: `Storno: ${record.reversalReason}`,
          },
        ]
      : [entry];
  });
};
