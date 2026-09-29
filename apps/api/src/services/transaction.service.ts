import type {
  BankStatementEntryWriteRequest,
  DeleteTransactionResult,
  FinanceExportQueryRequest,
  FinanceReportDto,
  FinanceReportQueryRequest,
  ListTransactionsQuery,
  ListSettlementTargetsQuery,
  PaginationMeta,
  PaymentMethod,
  PaymentAllocationDto,
  PaymentAllocationWriteRequest,
  SettleAdvancesRequest,
  SettleAdvancesResult,
  SettlementTargetDto,
  SettlementTargetsDto,
  SettlementTargetType,
  VatReportDto,
  TransactionCategory,
  TransactionDto,
  TransactionSourceType,
  TransactionWriteRequest,
  UnsettledAdvanceGroupDto,
  UnsettledAdvancesDto,
  UnsettledAdvancesQuery,
} from '@rental-admin/shared';
import { buildFinanceReport, defaultFinanceReportRange } from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { buildPaginationMeta } from '../utils/api-response';
import { badRequest, conflict, notFound } from '../utils/app-error';
import { logger } from '../utils/logger';
import { buildXlsx } from '../utils/xlsx';
import { toTransactionDto, type FinanceTransactionRecord } from '../utils/transaction-mapper';
import {
  FINANCE_EXPORT_LEDGER_LIMIT,
  buildFinanceExportDocument,
  financeExportSheets,
} from './finance-export-document';
import { buildFinanceReportPdf } from './pdf/finance-report-pdf';

type TransactionSortField = ListTransactionsQuery['sortBy'];
type SortOrder = ListTransactionsQuery['sortOrder'];
type TransactionOrderBy = Partial<Record<TransactionSortField, SortOrder>>;

const parseDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

const retiredFinanceSourceTypes: TransactionSourceType[] = ['COMPANY_EXPENSE', 'TRIP_REVENUE'];
const MONEY_EPSILON = 0.005;

type TransactionListFilters = Omit<
  ListTransactionsQuery,
  'page' | 'limit' | 'sortBy' | 'sortOrder'
>;

const transactionListWhere = (query: TransactionListFilters) => ({
  ...(query.type ? { type: query.type } : {}),
  ...(query.category ? { category: query.category } : {}),
  ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
  ...(query.sourceType
    ? { sourceType: query.sourceType }
    : { sourceType: { notIn: retiredFinanceSourceTypes } }),
  ...(query.status ? { status: query.status } : {}),
  ...(query.isAdvance !== undefined ? { isAdvance: query.isAdvance } : {}),
  ...(query.supplier
    ? { supplier: { contains: query.supplier, mode: 'insensitive' as const } }
    : {}),
  ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
  ...(query.driverId ? { driverId: query.driverId } : {}),
  ...(query.from || query.to
    ? {
        occurredAt: {
          ...(query.from ? { gte: parseDate(query.from) } : {}),
          ...(query.to ? { lte: parseDate(query.to) } : {}),
        },
      }
    : {}),
  ...(query.search
    ? {
        OR: [
          { note: { contains: query.search, mode: 'insensitive' as const } },
          { supplier: { contains: query.search, mode: 'insensitive' as const } },
          { partner: { contains: query.search, mode: 'insensitive' as const } },
          { route: { contains: query.search, mode: 'insensitive' as const } },
          { contractId: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }
    : {}),
});

const transactionInclude = {
  vehicle: { select: { id: true, make: true, model: true, licensePlate: true } },
  driver: { select: { id: true, firstName: true, lastName: true } },
  paymentAllocations: { select: { amount: true } },
} as const;

const assertVehicleExists = async (vehicleId: string | null): Promise<void> => {
  if (!vehicleId) {
    return;
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true },
  });

  if (!vehicle) {
    throw badRequest('Izabrano vozilo ne postoji.');
  }
};

const assertDriverExists = async (driverId: string | null): Promise<void> => {
  if (!driverId) {
    return;
  }

  const driver = await prisma.driver.findUnique({ where: { id: driverId }, select: { id: true } });

  if (!driver) {
    throw badRequest('Izabrani vozač ne postoji.');
  }
};

const toManualWriteData = (input: TransactionWriteRequest) => ({
  type: input.type,
  category: input.category,
  amount: input.amount,
  occurredAt: parseDate(input.occurredAt),
  paymentMethod: input.paymentMethod,
  note: input.note,
  supplier: input.supplier,
  partner: input.partner,
  route: input.route,
  vehicleId: input.vehicleId,
  driverId: input.driverId,
  contractId: input.contractId,
  isAdvance: input.isAdvance,
  status: input.isAdvance ? ('OPEN' as const) : ('OPEN' as const),
  sourceType: 'MANUAL' as const,
  sourceId: null,
  statementNumber: null,
  bankReference: null,
  linkedTransactionId: null,
});

const toBankStatementWriteData = (input: BankStatementEntryWriteRequest) => ({
  type: input.type,
  category: input.category,
  amount: input.amount,
  occurredAt: parseDate(input.occurredAt),
  paymentMethod: 'ACCOUNT' as const,
  note: input.note,
  supplier: input.supplier,
  partner: input.partner,
  route: input.route,
  vehicleId: input.vehicleId,
  driverId: input.driverId,
  contractId: input.contractId,
  isAdvance: false,
  status: 'SETTLED' as const,
  sourceType: 'BANK_STATEMENT' as const,
  sourceId: null,
  statementNumber: input.statementNumber,
  bankReference: input.bankReference,
  linkedTransactionId: null,
});

export const listTransactions = async (
  query: ListTransactionsQuery,
): Promise<{ transactions: TransactionDto[]; pagination: PaginationMeta }> => {
  const orderBy: TransactionOrderBy = { [query.sortBy]: query.sortOrder };

  const where = transactionListWhere(query);

  const [total, records] = await Promise.all([
    prisma.financeTransaction.count({ where }),
    prisma.financeTransaction.findMany({
      where,
      include: transactionInclude,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    transactions: records.map((record: FinanceTransactionRecord) => toTransactionDto(record)),
    pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
  };
};

export const getTransaction = async (id: string): Promise<TransactionDto> => {
  const record = await prisma.financeTransaction.findUnique({
    where: { id },
    include: transactionInclude,
  });

  if (!record) {
    throw notFound('Transakcija nije pronađena.');
  }

  return toTransactionDto(record);
};

export const createTransaction = async (
  input: TransactionWriteRequest,
): Promise<TransactionDto> => {
  await assertVehicleExists(input.vehicleId);
  await assertDriverExists(input.driverId);

  const record = await prisma.financeTransaction.create({
    data: toManualWriteData(input),
    include: transactionInclude,
  });

  logger.info('Transaction created', { transactionId: record.id, isAdvance: record.isAdvance });

  return toTransactionDto(record);
};

export const createBankStatementEntry = async (
  input: BankStatementEntryWriteRequest,
): Promise<TransactionDto> => {
  await assertVehicleExists(input.vehicleId);
  await assertDriverExists(input.driverId);

  const record = await prisma.financeTransaction.create({
    data: toBankStatementWriteData(input),
    include: transactionInclude,
  });

  logger.info('Bank statement entry created', {
    transactionId: record.id,
    statementNumber: record.statementNumber,
  });

  return toTransactionDto(record);
};

export const updateTransaction = async (
  id: string,
  input: TransactionWriteRequest,
): Promise<TransactionDto> => {
  const existing = await prisma.financeTransaction.findUnique({ where: { id } });

  if (!existing) {
    throw notFound('Transakcija nije pronađena.');
  }

  if (existing.sourceType !== 'MANUAL') {
    throw conflict('Automatska transakcija se menja izvornim zapisom, ne ručno.');
  }

  if (existing.status === 'SETTLED') {
    throw conflict('Razdužena transakcija se ne može menjati.');
  }

  await assertVehicleExists(input.vehicleId);
  await assertDriverExists(input.driverId);

  const record = await prisma.financeTransaction.update({
    where: { id },
    data: toManualWriteData(input),
    include: transactionInclude,
  });

  logger.info('Transaction updated', { transactionId: id });

  return toTransactionDto(record);
};

export const updateBankStatementEntry = async (
  id: string,
  input: BankStatementEntryWriteRequest,
): Promise<TransactionDto> => {
  const existing = await prisma.financeTransaction.findUnique({ where: { id } });

  if (!existing) {
    throw notFound('Stavka izvoda nije pronađena.');
  }

  if (existing.sourceType !== 'BANK_STATEMENT') {
    throw conflict('Samo stavke izvoda se menjaju iz ovog dela finansija.');
  }

  await assertVehicleExists(input.vehicleId);
  await assertDriverExists(input.driverId);

  const record = await prisma.financeTransaction.update({
    where: { id },
    data: toBankStatementWriteData(input),
    include: transactionInclude,
  });

  logger.info('Bank statement entry updated', { transactionId: id });

  return toTransactionDto(record);
};

export const deleteTransaction = async (id: string): Promise<DeleteTransactionResult> => {
  const existing = await prisma.financeTransaction.findUnique({
    where: { id },
    select: { id: true, sourceType: true, isAdvance: true, status: true },
  });

  if (!existing) {
    throw notFound('Transakcija nije pronađena.');
  }

  if (existing.sourceType !== 'MANUAL' && existing.sourceType !== 'BANK_STATEMENT') {
    throw conflict('Automatska transakcija se briše brisanjem izvornog zapisa.');
  }

  const linkedAdvances = await prisma.financeTransaction.count({
    where: { linkedTransactionId: id },
  });

  if (linkedAdvances > 0) {
    await prisma.financeTransaction.updateMany({
      where: { linkedTransactionId: id },
      data: { linkedTransactionId: null, status: 'OPEN' },
    });
  }

  await prisma.financeTransaction.delete({ where: { id } });
  logger.info('Transaction deleted', { transactionId: id, reopenedAdvances: linkedAdvances });

  return { id, deleted: true };
};

export const listUnsettledAdvances = async (
  query: UnsettledAdvancesQuery,
): Promise<UnsettledAdvancesDto> => {
  const records = await prisma.financeTransaction.findMany({
    where: {
      isAdvance: true,
      status: 'OPEN',
      ...(query.supplier
        ? { supplier: { equals: query.supplier, mode: 'insensitive' as const } }
        : {}),
    },
    include: transactionInclude,
    orderBy: [{ supplier: 'asc' }, { occurredAt: 'asc' }],
  });

  const bySupplier = new Map<string, FinanceTransactionRecord[]>();

  for (const record of records) {
    const key = record.supplier?.trim() || 'Bez dobavljača';
    const group = bySupplier.get(key) ?? [];
    group.push(record);
    bySupplier.set(key, group);
  }

  const groups: UnsettledAdvanceGroupDto[] = [...bySupplier.entries()].map(
    ([supplier, advances]) => ({
      supplier,
      total: advances.reduce((sum, row) => sum + row.amount, 0),
      count: advances.length,
      advances: advances.map((row) => toTransactionDto(row)),
    }),
  );

  return { groups };
};

export const settleAdvances = async (
  input: SettleAdvancesRequest,
): Promise<SettleAdvancesResult> => {
  const where = {
    isAdvance: true,
    status: 'OPEN' as const,
    supplier: { equals: input.supplier, mode: 'insensitive' as const },
    ...(input.advanceIds ? { id: { in: input.advanceIds } } : {}),
    ...(input.from || input.to
      ? {
          occurredAt: {
            ...(input.from ? { gte: parseDate(input.from) } : {}),
            ...(input.to ? { lte: parseDate(input.to) } : {}),
          },
        }
      : {}),
  };

  const advances = await prisma.financeTransaction.findMany({
    where,
    orderBy: { occurredAt: 'asc' },
  });

  if (advances.length === 0) {
    throw badRequest('Nema nerazduženih avansa za ovog dobavljača u izabranom periodu.');
  }

  if (input.advanceIds && input.advanceIds.length !== advances.length) {
    throw badRequest('Neki od izabranih avansa nisu nerazduženi ili ne pripadaju dobavljaču.');
  }

  const settledTotal = advances.reduce((sum, row) => sum + row.amount, 0);
  const amount = input.amount ?? settledTotal;
  const note = input.note ?? `${input.supplier.toUpperCase()} ISPLAĆENO`;

  const settlement = await prisma.$transaction(async (tx) => {
    const created = await tx.financeTransaction.create({
      data: {
        type: 'EXPENSE',
        category: 'FUEL',
        amount,
        occurredAt: parseDate(input.occurredAt),
        paymentMethod: input.paymentMethod,
        note,
        supplier: input.supplier,
        isAdvance: false,
        status: 'SETTLED',
        sourceType: 'MANUAL',
        sourceId: null,
      },
      include: transactionInclude,
    });

    await tx.financeTransaction.updateMany({
      where: { id: { in: advances.map((row) => row.id) } },
      data: { linkedTransactionId: created.id, status: 'SETTLED' },
    });

    return created;
  });

  logger.info('Advances settled', {
    settlementId: settlement.id,
    supplier: input.supplier,
    settledCount: advances.length,
    settledTotal,
  });

  return {
    settlement: toTransactionDto(settlement),
    settledCount: advances.length,
    settledTotal,
  };
};

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const toPaymentAllocationDto = (record: {
  id: string;
  transactionId: string;
  targetType: SettlementTargetType;
  targetId: string;
  amount: number;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}): PaymentAllocationDto => ({
  id: record.id,
  transactionId: record.transactionId,
  targetType: record.targetType,
  targetId: record.targetId,
  amount: record.amount,
  note: record.note,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const targetTypeForTransactionType = (type: 'INCOME' | 'EXPENSE'): SettlementTargetType[] =>
  type === 'EXPENSE' ? ['COMPANY_EXPENSE'] : ['TRIP_INVOICE', 'TRIP_SERIES_INVOICE'];

const allocatedByTarget = async (
  targetType: SettlementTargetType,
  targetIds: string[],
): Promise<Map<string, number>> => {
  if (targetIds.length === 0) {
    return new Map();
  }

  const rows = await prisma.paymentAllocation.groupBy({
    by: ['targetId'],
    where: { targetType, targetId: { in: targetIds } },
    _sum: { amount: true },
  });

  return new Map(rows.map((row) => [row.targetId, row._sum.amount ?? 0]));
};

const settlementTargetSearch = (query: string | undefined): string | undefined =>
  query?.trim() ? query.trim() : undefined;

const listCompanyExpenseSettlementTargets = async (
  query: ListSettlementTargetsQuery,
): Promise<SettlementTargetDto[]> => {
  const search = settlementTargetSearch(query.search);
  const records = await prisma.companyExpense.findMany({
    where: search
      ? {
          OR: [
            { supplier: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { invoiceNumber: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: [{ issuedAt: 'desc' }, { createdAt: 'desc' }],
    take: Math.max(query.limit * 4, query.limit),
  });
  const allocated = await allocatedByTarget(
    'COMPANY_EXPENSE',
    records.map((record) => record.id),
  );

  return records
    .map((record): SettlementTargetDto => {
      const allocatedAmount = roundMoney(allocated.get(record.id) ?? 0);
      const remainingAmount = roundMoney(record.amountWithVat - allocatedAmount);

      return {
        targetType: 'COMPANY_EXPENSE',
        targetId: record.id,
        label: [record.invoiceNumber ? `Račun ${record.invoiceNumber}` : null, record.description]
          .filter(Boolean)
          .join(' · '),
        counterparty: record.supplier,
        issuedAt: toIsoDate(record.issuedAt),
        totalAmount: record.amountWithVat,
        allocatedAmount,
        remainingAmount,
      };
    })
    .filter((target) => target.remainingAmount > MONEY_EPSILON)
    .slice(0, query.limit);
};

const tripCounterparty = (record: {
  clientName: string | null;
  partner: {
    type: string;
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
}): string => {
  if (record.clientName?.trim()) {
    return record.clientName.trim();
  }

  if (!record.partner) {
    return 'Bez kupca';
  }

  if (record.partner.type === 'INDIVIDUAL') {
    return (
      `${record.partner.firstName ?? ''} ${record.partner.lastName ?? ''}`.trim() || 'Bez kupca'
    );
  }

  return record.partner.companyName?.trim() || 'Bez kupca';
};

const tripLabel = (record: {
  referenceNumber: string | null;
  origin: string;
  destination: string;
  invoiceDescription: string | null;
}): string => {
  const route = `${record.origin} – ${record.destination}`;

  return [
    record.referenceNumber ? `RN ${record.referenceNumber}` : null,
    record.invoiceDescription?.trim() || route,
  ]
    .filter(Boolean)
    .join(' · ');
};

const listTripInvoiceSettlementTargets = async (
  query: ListSettlementTargetsQuery,
): Promise<SettlementTargetDto[]> => {
  const search = settlementTargetSearch(query.search);
  const trips = await prisma.trip.findMany({
    where: {
      invoicedAt: { not: null },
      ...(search
        ? {
            OR: [
              { referenceNumber: { contains: search, mode: 'insensitive' } },
              { origin: { contains: search, mode: 'insensitive' } },
              { destination: { contains: search, mode: 'insensitive' } },
              { clientName: { contains: search, mode: 'insensitive' } },
              { invoiceDescription: { contains: search, mode: 'insensitive' } },
              { partner: { companyName: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    include: {
      partner: { select: { type: true, companyName: true, firstName: true, lastName: true } },
    },
    orderBy: [{ invoicedAt: 'desc' }, { departureDate: 'desc' }],
    take: Math.max(query.limit * 8, query.limit),
  });

  const standalone = trips.filter((trip) => !trip.invoiceGroupId);
  const seriesGroups = new Map<string, typeof trips>();

  for (const trip of trips) {
    if (!trip.invoiceGroupId) {
      continue;
    }

    const group = seriesGroups.get(trip.invoiceGroupId) ?? [];
    group.push(trip);
    seriesGroups.set(trip.invoiceGroupId, group);
  }

  const standaloneAllocated = await allocatedByTarget(
    'TRIP_INVOICE',
    standalone.map((trip) => trip.id),
  );
  const seriesAllocated = await allocatedByTarget('TRIP_SERIES_INVOICE', [...seriesGroups.keys()]);

  const tripTargets = standalone.map((trip): SettlementTargetDto => {
    const totalAmount = trip.invoiceGrossAmount ?? trip.price ?? 0;
    const allocatedAmount = roundMoney(standaloneAllocated.get(trip.id) ?? 0);

    return {
      targetType: 'TRIP_INVOICE',
      targetId: trip.id,
      label: tripLabel(trip),
      counterparty: tripCounterparty(trip),
      issuedAt: toIsoDate(trip.invoicedAt ?? trip.departureDate),
      totalAmount,
      allocatedAmount,
      remainingAmount: roundMoney(totalAmount - allocatedAmount),
    };
  });

  const seriesTargets = [...seriesGroups.entries()].map(([groupId, group]): SettlementTargetDto => {
    const first = group[0];
    const totalAmount = roundMoney(
      group.reduce((sum, trip) => sum + (trip.invoiceGrossAmount ?? trip.price ?? 0), 0),
    );
    const allocatedAmount = roundMoney(seriesAllocated.get(groupId) ?? 0);

    return {
      targetType: 'TRIP_SERIES_INVOICE',
      targetId: groupId,
      label: first
        ? `${tripLabel(first)} · serija ${group.length} dana`
        : `Serijska faktura ${groupId}`,
      counterparty: first ? tripCounterparty(first) : 'Bez kupca',
      issuedAt: first ? toIsoDate(first.invoicedAt ?? first.departureDate) : '',
      totalAmount,
      allocatedAmount,
      remainingAmount: roundMoney(totalAmount - allocatedAmount),
    };
  });

  return [...tripTargets, ...seriesTargets]
    .filter((target) => target.totalAmount > MONEY_EPSILON)
    .filter((target) => target.remainingAmount > MONEY_EPSILON)
    .sort((left, right) => right.issuedAt.localeCompare(left.issuedAt))
    .slice(0, query.limit);
};

export const listSettlementTargets = async (
  query: ListSettlementTargetsQuery,
): Promise<SettlementTargetsDto> => {
  let type = query.type;

  if (query.transactionId) {
    const transaction = await prisma.financeTransaction.findUnique({
      where: { id: query.transactionId },
      select: { type: true },
    });

    if (!transaction) {
      throw notFound('Transakcija nije pronađena.');
    }

    type = transaction.type;
  }

  if (type === 'EXPENSE') {
    return { targets: await listCompanyExpenseSettlementTargets(query) };
  }

  if (type === 'INCOME') {
    return { targets: await listTripInvoiceSettlementTargets(query) };
  }

  return { targets: [] };
};

const getSettlementTarget = async (
  targetType: SettlementTargetType,
  targetId: string,
): Promise<SettlementTargetDto> => {
  const allocated = await allocatedByTarget(targetType, [targetId]);
  const allocatedAmount = roundMoney(allocated.get(targetId) ?? 0);

  if (targetType === 'COMPANY_EXPENSE') {
    const record = await prisma.companyExpense.findUnique({ where: { id: targetId } });

    if (!record) {
      throw notFound('Račun dobavljača nije pronađen.');
    }

    return {
      targetType,
      targetId,
      label: [record.invoiceNumber ? `Račun ${record.invoiceNumber}` : null, record.description]
        .filter(Boolean)
        .join(' · '),
      counterparty: record.supplier,
      issuedAt: toIsoDate(record.issuedAt),
      totalAmount: record.amountWithVat,
      allocatedAmount,
      remainingAmount: roundMoney(record.amountWithVat - allocatedAmount),
    };
  }

  if (targetType === 'TRIP_INVOICE') {
    const record = await prisma.trip.findUnique({
      where: { id: targetId },
      include: {
        partner: { select: { type: true, companyName: true, firstName: true, lastName: true } },
      },
    });

    if (!record || !record.invoicedAt) {
      throw notFound('Faktura vožnje nije pronađena.');
    }

    const totalAmount = record.invoiceGrossAmount ?? record.price ?? 0;

    return {
      targetType,
      targetId,
      label: tripLabel(record),
      counterparty: tripCounterparty(record),
      issuedAt: toIsoDate(record.invoicedAt),
      totalAmount,
      allocatedAmount,
      remainingAmount: roundMoney(totalAmount - allocatedAmount),
    };
  }

  const rows = await prisma.trip.findMany({
    where: { invoiceGroupId: targetId, invoicedAt: { not: null } },
    include: {
      partner: { select: { type: true, companyName: true, firstName: true, lastName: true } },
    },
    orderBy: { departureDate: 'asc' },
  });
  const first = rows[0];

  if (!first) {
    throw notFound('Mesečna faktura serije nije pronađena.');
  }

  const totalAmount = roundMoney(
    rows.reduce((sum, row) => sum + (row.invoiceGrossAmount ?? row.price ?? 0), 0),
  );

  return {
    targetType,
    targetId,
    label: `${tripLabel(first)} · serija ${rows.length} dana`,
    counterparty: tripCounterparty(first),
    issuedAt: toIsoDate(first.invoicedAt ?? first.departureDate),
    totalAmount,
    allocatedAmount,
    remainingAmount: roundMoney(totalAmount - allocatedAmount),
  };
};

const refreshTargetPaidAt = async (
  targetType: SettlementTargetType,
  targetId: string,
  paidAt: Date,
): Promise<void> => {
  const allocated = await allocatedByTarget(targetType, [targetId]);
  const allocatedAmount = allocated.get(targetId) ?? 0;

  if (targetType === 'COMPANY_EXPENSE') {
    const record = await prisma.companyExpense.findUnique({
      where: { id: targetId },
      select: { amountWithVat: true },
    });
    const isPaid = record ? allocatedAmount + MONEY_EPSILON >= record.amountWithVat : false;

    await prisma.companyExpense.updateMany({
      where: { id: targetId },
      data: { paidAt: isPaid ? paidAt : null },
    });
    return;
  }

  if (targetType === 'TRIP_INVOICE') {
    const record = await prisma.trip.findUnique({
      where: { id: targetId },
      select: { invoiceGrossAmount: true, price: true },
    });
    const totalAmount = record ? (record.invoiceGrossAmount ?? record.price ?? 0) : 0;
    const isPaid = allocatedAmount + MONEY_EPSILON >= totalAmount;

    await prisma.trip.updateMany({
      where: { id: targetId },
      data: { paidAt: isPaid ? paidAt : null },
    });
    return;
  }

  const rows = await prisma.trip.findMany({
    where: { invoiceGroupId: targetId },
    select: { invoiceGrossAmount: true, price: true },
  });
  const totalAmount = rows.reduce(
    (sum, row) => sum + (row.invoiceGrossAmount ?? row.price ?? 0),
    0,
  );
  const isPaid = allocatedAmount + MONEY_EPSILON >= totalAmount;

  await prisma.trip.updateMany({
    where: { invoiceGroupId: targetId },
    data: { paidAt: isPaid ? paidAt : null },
  });
};

export const createPaymentAllocation = async (
  transactionId: string,
  input: PaymentAllocationWriteRequest,
): Promise<{ allocation: PaymentAllocationDto; transaction: TransactionDto }> => {
  const transaction = await prisma.financeTransaction.findUnique({
    where: { id: transactionId },
    include: transactionInclude,
  });

  if (!transaction) {
    throw notFound('Transakcija nije pronađena.');
  }

  if (transaction.sourceType !== 'MANUAL' && transaction.sourceType !== 'BANK_STATEMENT') {
    throw conflict('Rasknjižavanje je dozvoljeno samo za ručne, keš i stavke izvoda.');
  }

  if (!targetTypeForTransactionType(transaction.type).includes(input.targetType)) {
    throw badRequest('Izabrano zaduženje ne odgovara smeru transakcije.');
  }

  const existing = await prisma.paymentAllocation.findUnique({
    where: {
      transactionId_targetType_targetId: {
        transactionId,
        targetType: input.targetType,
        targetId: input.targetId,
      },
    },
  });
  const allocatedOnTransaction = transaction.paymentAllocations.reduce(
    (sum, allocation) => sum + allocation.amount,
    0,
  );
  const availableOnTransaction = roundMoney(
    transaction.amount - allocatedOnTransaction + (existing?.amount ?? 0),
  );
  const target = await getSettlementTarget(input.targetType, input.targetId);
  const availableOnTarget = roundMoney(target.remainingAmount + (existing?.amount ?? 0));

  if (input.amount > availableOnTransaction + MONEY_EPSILON) {
    throw badRequest('Iznos je veći od nerasknjiženog dela transakcije.');
  }

  if (input.amount > availableOnTarget + MONEY_EPSILON) {
    throw badRequest('Iznos je veći od otvorenog zaduženja.');
  }

  const allocation = await prisma.paymentAllocation.upsert({
    where: {
      transactionId_targetType_targetId: {
        transactionId,
        targetType: input.targetType,
        targetId: input.targetId,
      },
    },
    create: {
      transactionId,
      targetType: input.targetType,
      targetId: input.targetId,
      amount: input.amount,
      note: input.note,
    },
    update: {
      amount: input.amount,
      note: input.note,
    },
  });

  await refreshTargetPaidAt(input.targetType, input.targetId, transaction.occurredAt);

  const updated = await prisma.financeTransaction.findUniqueOrThrow({
    where: { id: transactionId },
    include: transactionInclude,
  });

  logger.info('Payment allocation saved', {
    transactionId,
    allocationId: allocation.id,
    targetType: input.targetType,
    targetId: input.targetId,
  });

  return {
    allocation: toPaymentAllocationDto(allocation),
    transaction: toTransactionDto(updated),
  };
};

export interface OperationalExpenseInput {
  sourceType: Exclude<TransactionSourceType, 'MANUAL' | 'BANK_STATEMENT'>;
  sourceId: string;
  category: TransactionCategory;
  amount: number | null | undefined;
  paymentMethod: PaymentMethod | null | undefined;
  occurredAt: string;
  vehicleId?: string | null;
  driverId?: string | null;
  supplier?: string | null;
  partner?: string | null;
  route?: string | null;
  note?: string | null;
  /** When set, the caller owns open/settled. Omitted calls leave a settled row untouched. */
  status?: 'OPEN' | 'SETTLED';
}

const postedFields = (
  amount: number | null | undefined,
  paymentMethod: PaymentMethod | null | undefined,
): { amount: number; paymentMethod: PaymentMethod } | null => {
  if (
    amount === null ||
    amount === undefined ||
    amount <= 0 ||
    paymentMethod === null ||
    paymentMethod === undefined
  ) {
    return null;
  }

  return { amount, paymentMethod };
};

/**
 * Keeps one FinanceTransaction in sync with an operational source row —
 * an amount of `null`/`undefined` (or one with no payment method) removes
 * the transaction instead of leaving a stale/zero row behind. Shared by
 * every "auto-posted" side effect (fuel, maintenance, trip costs, and now
 * trip revenue and driver payouts) — only the `type` differs.
 */
const upsertOperationalTransaction = async (
  type: 'INCOME' | 'EXPENSE',
  input: OperationalExpenseInput,
): Promise<void> => {
  const existing = await prisma.financeTransaction.findFirst({
    where: { sourceType: input.sourceType, sourceId: input.sourceId },
    select: { id: true, status: true, isAdvance: true },
  });
  const posted = postedFields(input.amount, input.paymentMethod);

  if (!posted) {
    if (existing && existing.status !== 'SETTLED') {
      await prisma.financeTransaction.delete({ where: { id: existing.id } });
    }

    return;
  }

  const data = {
    type,
    category: input.category,
    amount: posted.amount,
    occurredAt: parseDate(input.occurredAt),
    paymentMethod: posted.paymentMethod,
    note: input.note ?? null,
    supplier: input.supplier ?? null,
    partner: input.partner ?? null,
    route: input.route ?? null,
    vehicleId: input.vehicleId ?? null,
    driverId: input.driverId ?? null,
    isAdvance: false,
    status: input.status ?? 'OPEN',
    sourceType: input.sourceType,
    sourceId: input.sourceId,
  };

  if (existing) {
    if (existing.isAdvance) {
      return;
    }

    if (existing.status === 'SETTLED' && input.status === undefined) {
      return;
    }

    await prisma.financeTransaction.update({ where: { id: existing.id }, data });
    return;
  }

  await prisma.financeTransaction.create({ data });
};

export const upsertOperationalExpense = (input: OperationalExpenseInput): Promise<void> =>
  upsertOperationalTransaction('EXPENSE', input);

/** Same upsert-in-place behavior as `upsertOperationalExpense`, posted as INCOME instead. */
export const upsertOperationalIncome = (input: OperationalExpenseInput): Promise<void> =>
  upsertOperationalTransaction('INCOME', input);

export const deleteOperationalTransaction = async (
  sourceType: Exclude<TransactionSourceType, 'MANUAL' | 'BANK_STATEMENT'>,
  sourceId: string,
  options?: { includeSettled?: boolean },
): Promise<void> => {
  await prisma.financeTransaction.deleteMany({
    where: {
      sourceType,
      sourceId,
      ...(options?.includeSettled ? {} : { status: { not: 'SETTLED' as const } }),
    },
  });
};

export const getFinanceReport = async (
  query: FinanceReportQueryRequest,
): Promise<FinanceReportDto> => {
  const defaults = defaultFinanceReportRange();
  const from = query.from ?? defaults.from;
  const to = query.to ?? defaults.to;

  const records = await prisma.financeTransaction.findMany({
    where: {
      occurredAt: { gte: parseDate(from), lte: parseDate(to) },
      ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
      sourceType: { notIn: retiredFinanceSourceTypes },
      NOT: { isAdvance: true, status: 'SETTLED' },
    },
    select: {
      type: true,
      category: true,
      amount: true,
      occurredAt: true,
      paymentMethod: true,
      partner: true,
      route: true,
      vehicle: { select: { id: true, make: true, model: true, licensePlate: true } },
    },
  });

  return buildFinanceReport(
    records.map((record) => ({
      type: record.type,
      category: record.category,
      amount: record.amount,
      occurredAt: toIsoDate(record.occurredAt),
      paymentMethod: record.paymentMethod,
      vehicle: record.vehicle,
      partner: record.partner,
      route: record.route,
    })),
    from,
    to,
  );
};

const monthKey = (value: Date): string => value.toISOString().slice(0, 7);

const listVatMonthsInclusive = (
  from: string,
  to: string,
): Array<{ key: string; year: number; month: number }> => {
  const start = new Date(`${from.slice(0, 7)}-01T00:00:00.000Z`);
  const end = new Date(`${to.slice(0, 7)}-01T00:00:00.000Z`);
  const months: Array<{ key: string; year: number; month: number }> = [];
  const cursor = new Date(start);

  while (cursor.getTime() <= end.getTime()) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth() + 1;
    months.push({ key: `${year}-${String(month).padStart(2, '0')}`, year, month });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months;
};

export const getVatReport = async (query: FinanceReportQueryRequest): Promise<VatReportDto> => {
  const defaults = defaultFinanceReportRange();
  const from = query.from ?? defaults.from;
  const to = query.to ?? defaults.to;
  const [expenses, trips] = await Promise.all([
    prisma.companyExpense.findMany({
      where: { issuedAt: { gte: parseDate(from), lte: parseDate(to) } },
      select: { issuedAt: true, vatAmount: true },
    }),
    prisma.trip.findMany({
      where: {
        invoicedAt: { gte: parseDate(from), lte: parseDate(to) },
        invoiceVatAmount: { not: null },
      },
      select: { invoicedAt: true, invoiceVatAmount: true },
    }),
  ]);
  const byMonth = new Map<
    string,
    { year: number; month: number; inputVat: number; outputVat: number }
  >(
    listVatMonthsInclusive(from, to).map((month) => [
      month.key,
      { year: month.year, month: month.month, inputVat: 0, outputVat: 0 },
    ]),
  );

  for (const expense of expenses) {
    const bucket = byMonth.get(monthKey(expense.issuedAt));

    if (bucket) {
      bucket.inputVat += expense.vatAmount;
    }
  }

  for (const trip of trips) {
    if (!trip.invoicedAt) {
      continue;
    }

    const bucket = byMonth.get(monthKey(trip.invoicedAt));

    if (bucket) {
      bucket.outputVat += trip.invoiceVatAmount ?? 0;
    }
  }

  const monthly = [...byMonth.values()].map((row) => ({
    ...row,
    inputVat: roundMoney(row.inputVat),
    outputVat: roundMoney(row.outputVat),
    balance: roundMoney(row.outputVat - row.inputVat),
  }));
  const totals = monthly.reduce(
    (sum, row) => ({
      inputVat: roundMoney(sum.inputVat + row.inputVat),
      outputVat: roundMoney(sum.outputVat + row.outputVat),
      balance: roundMoney(sum.balance + row.balance),
    }),
    { inputVat: 0, outputVat: 0, balance: 0 },
  );

  return { from, to, totals, monthly };
};

export interface FinanceExportFile {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}

export const exportFinanceReport = async (
  query: FinanceExportQueryRequest,
): Promise<FinanceExportFile> => {
  const { format, ...filters } = query;
  const records = await prisma.financeTransaction.findMany({
    where: transactionListWhere(filters),
    include: transactionInclude,
    orderBy: { occurredAt: 'desc' },
    take: FINANCE_EXPORT_LEDGER_LIMIT + 1,
  });
  const truncated = records.length > FINANCE_EXPORT_LEDGER_LIMIT;
  const ledgerRecords = truncated ? records.slice(0, FINANCE_EXPORT_LEDGER_LIMIT) : records;
  const newest = ledgerRecords[0];
  const oldest = ledgerRecords[ledgerRecords.length - 1];
  const defaults = defaultFinanceReportRange();
  const from = filters.from ?? (oldest ? toIsoDate(oldest.occurredAt) : defaults.from);
  const to = filters.to ?? (newest ? toIsoDate(newest.occurredAt) : defaults.to);

  const report = buildFinanceReport(
    ledgerRecords
      .filter((record) => !(record.isAdvance && record.status === 'SETTLED'))
      .map((record) => ({
        type: record.type,
        category: record.category,
        amount: record.amount,
        occurredAt: toIsoDate(record.occurredAt),
        paymentMethod: record.paymentMethod,
        vehicle: record.vehicle,
        partner: record.partner,
        route: record.route,
      })),
    from,
    to,
  );

  const document = buildFinanceExportDocument({
    report,
    transactions: ledgerRecords.map((record) => toTransactionDto(record)),
    advances: await listUnsettledAdvances({ supplier: filters.supplier }),
    query: filters,
    truncated,
  });

  if (format === 'xlsx') {
    return {
      buffer: buildXlsx(financeExportSheets(document)),
      fileName: `${document.fileStem}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  return {
    buffer: await buildFinanceReportPdf(document),
    fileName: `${document.fileStem}.pdf`,
    mimeType: 'application/pdf',
  };
};
