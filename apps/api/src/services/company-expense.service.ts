import {
  companyExpenseFinanceCategory,
  companyExpenseFinanceNote,
  type CompanyExpenseDto,
  type CompanyExpenseSummaryDto,
  type CompanyExpenseSummaryQuery,
  type CompanyExpenseSuppliersDto,
  type CompanyExpenseWriteRequest,
  type DeleteCompanyExpenseResult,
  type ListCompanyExpensesQuery,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { badRequest, notFound } from '../utils/app-error';
import {
  toCompanyExpenseDto,
  type CompanyExpenseRecord,
} from '../utils/company-expense-mapper';
import { logger } from '../utils/logger';
import { deleteOperationalTransaction, upsertOperationalExpense } from './transaction.service';

const parseDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

const companyExpenseInclude = {
  vehicle: { select: { id: true, make: true, model: true, licensePlate: true } },
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

const toWriteData = (input: CompanyExpenseWriteRequest) => ({
  issuedAt: parseDate(input.issuedAt),
  paidAt: null,
  invoiceNumber: input.invoiceNumber,
  supplier: input.supplier,
  description: input.description,
  amount: input.amountWithVat,
  amountWithoutVat: input.amountWithoutVat,
  vatAmount: input.vatAmount,
  amountWithVat: input.amountWithVat,
  paymentMethod: input.paymentMethod,
  vehicleId: input.vehicleId,
  odometerKm: input.odometerKm,
});

const expenseListWhere = (query: ListCompanyExpensesQuery | CompanyExpenseSummaryQuery) => ({
  ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
  ...(query.commonOnly ? { vehicleId: null } : {}),
  ...(query.supplier
    ? { supplier: { contains: query.supplier, mode: 'insensitive' as const } }
    : {}),
  ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
  ...(query.from || query.to
    ? {
        issuedAt: {
          ...(query.from ? { gte: parseDate(query.from) } : {}),
          ...(query.to ? { lte: parseDate(query.to) } : {}),
        },
      }
    : {}),
});

const syncCompanyExpenseFinance = async (record: CompanyExpenseRecord): Promise<void> => {
  const expense = toCompanyExpenseDto(record);

  await upsertOperationalExpense({
    sourceType: 'COMPANY_EXPENSE',
    sourceId: expense.id,
    category: companyExpenseFinanceCategory(expense.description),
    amount: expense.amountWithVat,
    paymentMethod: expense.paymentMethod,
    occurredAt: expense.issuedAt,
    vehicleId: expense.vehicleId,
    supplier: expense.supplier,
    note: companyExpenseFinanceNote(expense),
    status: 'SETTLED',
  });
};

const bumpVehicleMileage = async (
  vehicleId: string | null,
  odometerKm: number | null,
): Promise<void> => {
  if (!vehicleId || odometerKm === null) {
    return;
  }

  await prisma.vehicle.updateMany({
    where: { id: vehicleId, currentMileage: { lt: odometerKm } },
    data: { currentMileage: odometerKm },
  });
};

export const listCompanyExpenses = async (
  query: ListCompanyExpensesQuery,
): Promise<CompanyExpenseDto[]> => {
  await assertVehicleExists(query.vehicleId ?? null);

  const records = await prisma.companyExpense.findMany({
    where: expenseListWhere(query),
    include: companyExpenseInclude,
    orderBy: [{ [query.sortBy]: query.sortOrder }, { createdAt: query.sortOrder }],
  });

  return records.map((record: CompanyExpenseRecord) => toCompanyExpenseDto(record));
};

export const getCompanyExpense = async (
  expenseId: string,
  vehicleId?: string,
): Promise<CompanyExpenseDto> => {
  const record = await prisma.companyExpense.findFirst({
    where: { id: expenseId, ...(vehicleId ? { vehicleId } : {}) },
    include: companyExpenseInclude,
  });

  if (!record) {
    throw notFound('Trošak nije pronađen.');
  }

  return toCompanyExpenseDto(record);
};

export const createCompanyExpense = async (
  input: CompanyExpenseWriteRequest,
): Promise<CompanyExpenseDto> => {
  await assertVehicleExists(input.vehicleId);

  const record = await prisma.companyExpense.create({
    data: toWriteData(input),
    include: companyExpenseInclude,
  });

  await bumpVehicleMileage(input.vehicleId, input.odometerKm);
  await syncCompanyExpenseFinance(record);

  logger.info('Company expense created', { expenseId: record.id, vehicleId: record.vehicleId });

  return toCompanyExpenseDto(record);
};

export const updateCompanyExpense = async (
  expenseId: string,
  input: CompanyExpenseWriteRequest,
): Promise<CompanyExpenseDto> => {
  const existing = await prisma.companyExpense.findUnique({ where: { id: expenseId } });

  if (!existing) {
    throw notFound('Trošak nije pronađen.');
  }

  await assertVehicleExists(input.vehicleId);

  const record = await prisma.companyExpense.update({
    where: { id: expenseId },
    data: toWriteData(input),
    include: companyExpenseInclude,
  });

  await bumpVehicleMileage(input.vehicleId, input.odometerKm);
  await syncCompanyExpenseFinance(record);

  logger.info('Company expense updated', { expenseId, vehicleId: record.vehicleId });

  return toCompanyExpenseDto(record);
};

export const deleteCompanyExpense = async (
  expenseId: string,
): Promise<DeleteCompanyExpenseResult> => {
  const existing = await prisma.companyExpense.findUnique({ where: { id: expenseId } });

  if (!existing) {
    throw notFound('Trošak nije pronađen.');
  }

  await deleteOperationalTransaction('COMPANY_EXPENSE', expenseId, { includeSettled: true });
  await prisma.companyExpense.delete({ where: { id: expenseId } });
  logger.info('Company expense deleted', { expenseId, vehicleId: existing.vehicleId });

  return { id: expenseId, deleted: true };
};

export const listVehicleCompanyExpenses = async (
  vehicleId: string,
  query: ListCompanyExpensesQuery,
): Promise<CompanyExpenseDto[]> => {
  await assertVehicleExists(vehicleId);

  return listCompanyExpenses({ ...query, vehicleId, commonOnly: undefined });
};

export const getCompanyExpenseSummary = async (
  query: CompanyExpenseSummaryQuery,
): Promise<CompanyExpenseSummaryDto> => {
  await assertVehicleExists(query.vehicleId ?? null);

  const records = await prisma.companyExpense.findMany({
    where: expenseListWhere(query),
    select: { amount: true, amountWithoutVat: true, vatAmount: true },
  });

  return records.reduce<CompanyExpenseSummaryDto>(
    (summary, record) => {
      summary.total += record.amount;
      summary.totalWithoutVat += record.amountWithoutVat;
      summary.totalVat += record.vatAmount;
      summary.count += 1;

      return summary;
    },
    {
      total: 0,
      totalWithoutVat: 0,
      totalVat: 0,
      count: 0,
    },
  );
};

export const syncAllCompanyExpensesToFinance = async (): Promise<{ count: number; total: number }> => {
  const records = await prisma.companyExpense.findMany({ include: companyExpenseInclude });
  let total = 0;

  for (const record of records) {
    await syncCompanyExpenseFinance(record);
    total += record.amountWithVat;
  }

  logger.info('Company expenses posted to finance', { count: records.length, total });

  return { count: records.length, total: Math.round(total * 100) / 100 };
};

export const listCompanyExpenseSuppliers = async (): Promise<CompanyExpenseSuppliersDto> => {
  const rows = await prisma.companyExpense.findMany({
    where: { supplier: { not: '' } },
    distinct: ['supplier'],
    select: { supplier: true },
    orderBy: { supplier: 'asc' },
  });

  return {
    suppliers: rows.map((row) => row.supplier).sort((left, right) => left.localeCompare(right, 'sr')),
  };
};
