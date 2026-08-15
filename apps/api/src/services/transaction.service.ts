import type {
  DeleteTransactionResult,
  FinanceExportQueryRequest,
  FinanceReportDto,
  FinanceReportQueryRequest,
  ListTransactionsQuery,
  PaginationMeta,
  PaymentMethod,
  SettleAdvancesRequest,
  SettleAdvancesResult,
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
import {
  toTransactionDto,
  type FinanceTransactionRecord,
} from '../utils/transaction-mapper';
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

type TransactionListFilters = Omit<ListTransactionsQuery, 'page' | 'limit' | 'sortBy' | 'sortOrder'>;

const transactionListWhere = (query: TransactionListFilters) => ({
  ...(query.type ? { type: query.type } : {}),
  ...(query.category ? { category: query.category } : {}),
  ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
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
} as const;

const assertVehicleExists = async (vehicleId: string | null): Promise<void> => {
  if (!vehicleId) {
    return;
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true } });

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

export const createTransaction = async (input: TransactionWriteRequest): Promise<TransactionDto> => {
  await assertVehicleExists(input.vehicleId);
  await assertDriverExists(input.driverId);

  const record = await prisma.financeTransaction.create({
    data: toManualWriteData(input),
    include: transactionInclude,
  });

  logger.info('Transaction created', { transactionId: record.id, isAdvance: record.isAdvance });

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

export const deleteTransaction = async (id: string): Promise<DeleteTransactionResult> => {
  const existing = await prisma.financeTransaction.findUnique({
    where: { id },
    select: { id: true, sourceType: true, isAdvance: true, status: true },
  });

  if (!existing) {
    throw notFound('Transakcija nije pronađena.');
  }

  if (existing.sourceType !== 'MANUAL') {
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

  const groups: UnsettledAdvanceGroupDto[] = [...bySupplier.entries()].map(([supplier, advances]) => ({
    supplier,
    total: advances.reduce((sum, row) => sum + row.amount, 0),
    count: advances.length,
    advances: advances.map((row) => toTransactionDto(row)),
  }));

  return { groups };
};

export const settleAdvances = async (input: SettleAdvancesRequest): Promise<SettleAdvancesResult> => {
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

export interface OperationalExpenseInput {
  sourceType: Exclude<TransactionSourceType, 'MANUAL'>;
  sourceId: string;
  category: TransactionCategory;
  amount: number | null | undefined;
  paymentMethod: PaymentMethod | null | undefined;
  occurredAt: string;
  vehicleId: string;
  driverId?: string | null;
  supplier?: string | null;
  note?: string | null;
}

const postedExpenseFields = (
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

export const upsertOperationalExpense = async (input: OperationalExpenseInput): Promise<void> => {
  const existing = await prisma.financeTransaction.findFirst({
    where: { sourceType: input.sourceType, sourceId: input.sourceId },
    select: { id: true, status: true, isAdvance: true },
  });
  const posted = postedExpenseFields(input.amount, input.paymentMethod);

  if (!posted) {
    if (existing && existing.status !== 'SETTLED') {
      await prisma.financeTransaction.delete({ where: { id: existing.id } });
    }

    return;
  }

  const data = {
    type: 'EXPENSE' as const,
    category: input.category,
    amount: posted.amount,
    occurredAt: parseDate(input.occurredAt),
    paymentMethod: posted.paymentMethod,
    note: input.note ?? null,
    supplier: input.supplier ?? null,
    vehicleId: input.vehicleId,
    driverId: input.driverId ?? null,
    isAdvance: false,
    status: 'OPEN' as const,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
  };

  if (existing) {
    if (existing.status === 'SETTLED' || existing.isAdvance) {
      return;
    }

    await prisma.financeTransaction.update({ where: { id: existing.id }, data });
    return;
  }

  await prisma.financeTransaction.create({ data });
};

export const deleteOperationalTransaction = async (
  sourceType: Exclude<TransactionSourceType, 'MANUAL'>,
  sourceId: string,
): Promise<void> => {
  await prisma.financeTransaction.deleteMany({
    where: { sourceType, sourceId, status: { not: 'SETTLED' } },
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

