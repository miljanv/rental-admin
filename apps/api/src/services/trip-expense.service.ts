import {
  computeTripSettlement,
  tripClientDisplayName,
  tripRouteLabel,
  TRIP_EXPENSE_CATEGORY_LABELS,
  type DeleteTripExpenseResult,
  type PaymentMethod,
  type TransactionCategory,
  type TripExpenseCategory,
  type TripExpenseDto,
  type TripExpensePaymentMethod,
  type TripExpenseWriteRequest,
  type TripSettlementDto,
  type TripSettlementWriteRequest,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { badRequest, notFound } from '../utils/app-error';
import { logger } from '../utils/logger';
import { toTripDto } from '../utils/trip-mapper';
import { toTripExpenseDto, type TripExpenseRecord } from '../utils/trip-expense-mapper';
import { assertUploadedFile, deleteAttachedFile } from './file-attachment.service';
import {
  deleteOperationalTransaction,
  upsertOperationalExpense,
} from './transaction.service';
import { parseDate, tripInclude } from './trip.service';

const expenseInclude = { file: true } as const;

const toFinancePaymentMethod = (method: TripExpensePaymentMethod): PaymentMethod =>
  method === 'CASH' ? 'CASH' : 'ACCOUNT';

const toFinanceCategory = (category: TripExpenseCategory): TransactionCategory => {
  switch (category) {
    case 'FUEL':
      return 'FUEL';
    case 'PER_DIEM':
      return 'SALARY';
    case 'ROADSIDE_REPAIR':
      return 'PARTS';
    default:
      return 'OTHER';
  }
};

const loadTrip = async (tripId: string) => {
  const record = await prisma.trip.findUnique({ where: { id: tripId }, include: tripInclude });

  if (!record) {
    throw notFound('Vožnja nije pronađena.');
  }

  return record;
};

const loadExpense = async (tripId: string, expenseId: string): Promise<TripExpenseRecord> => {
  const record = await prisma.tripExpense.findFirst({
    where: { id: expenseId, tripId },
    include: expenseInclude,
  });

  if (!record) {
    throw notFound('Trošak nije pronađen.');
  }

  return record;
};

const financeNote = (
  trip: { referenceNumber: string | null; origin: string; destination: string },
  expense: { category: TripExpenseCategory; note: string | null },
): string => {
  const prefix = trip.referenceNumber
    ? `Vožnja ${trip.referenceNumber}`
    : `Vožnja ${trip.origin} - ${trip.destination}`;
  const category = TRIP_EXPENSE_CATEGORY_LABELS[expense.category];

  return expense.note ? `${prefix} · ${category} — ${expense.note}` : `${prefix} · ${category}`;
};

const syncFinanceExpense = async (
  tripId: string,
  expense: {
    id: string;
    category: TripExpenseCategory;
    amount: number;
    paymentMethod: TripExpensePaymentMethod;
    note: string | null;
  },
): Promise<void> => {
  const trip = toTripDto(await loadTrip(tripId));

  await upsertOperationalExpense({
    sourceType: 'TRIP_EXPENSE',
    sourceId: expense.id,
    category: toFinanceCategory(expense.category),
    amount: expense.amount,
    paymentMethod: toFinancePaymentMethod(expense.paymentMethod),
    occurredAt: trip.departureDate,
    vehicleId: trip.vehicles[0]?.id ?? null,
    partner: tripClientDisplayName(trip) || null,
    route: tripRouteLabel(trip),
    note: financeNote(trip, expense),
  });
};

const assertCarrierExists = async (carrierId: string | null): Promise<void> => {
  if (!carrierId) {
    return;
  }

  const partner = await prisma.partner.findUnique({ where: { id: carrierId }, select: { id: true } });

  if (!partner) {
    throw badRequest('Izabrani prevoznik ne postoji.');
  }
};

export const listTripExpenses = async (tripId: string): Promise<TripExpenseDto[]> => {
  await loadTrip(tripId);

  const records = await prisma.tripExpense.findMany({
    where: { tripId },
    include: expenseInclude,
    orderBy: { createdAt: 'asc' },
  });

  return records.map((record: TripExpenseRecord) => toTripExpenseDto(record));
};

export const createTripExpense = async (
  tripId: string,
  input: TripExpenseWriteRequest,
): Promise<TripExpenseDto> => {
  await loadTrip(tripId);
  await assertUploadedFile(input.fileId);

  const record = await prisma.tripExpense.create({
    data: {
      tripId,
      category: input.category,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      note: input.note,
      fileId: input.fileId,
    },
    include: expenseInclude,
  });

  await syncFinanceExpense(tripId, record);
  logger.info('Trip expense created', { tripId, expenseId: record.id });

  return toTripExpenseDto(record);
};

export const updateTripExpense = async (
  tripId: string,
  expenseId: string,
  input: TripExpenseWriteRequest,
): Promise<TripExpenseDto> => {
  const existing = await loadExpense(tripId, expenseId);
  await assertUploadedFile(input.fileId);

  const record = await prisma.tripExpense.update({
    where: { id: expenseId },
    data: {
      category: input.category,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      note: input.note,
      fileId: input.fileId,
    },
    include: expenseInclude,
  });

  if (existing.fileId && existing.fileId !== input.fileId) {
    await deleteAttachedFile(existing.fileId);
  }

  await syncFinanceExpense(tripId, record);
  logger.info('Trip expense updated', { tripId, expenseId });

  return toTripExpenseDto(record);
};

export const deleteTripExpense = async (
  tripId: string,
  expenseId: string,
): Promise<DeleteTripExpenseResult> => {
  const existing = await loadExpense(tripId, expenseId);

  await deleteOperationalTransaction('TRIP_EXPENSE', expenseId);
  await prisma.tripExpense.delete({ where: { id: expenseId } });
  await deleteAttachedFile(existing.fileId);
  logger.info('Trip expense deleted', { tripId, expenseId });

  return { id: expenseId, deleted: true };
};

export const getTripSettlement = async (tripId: string): Promise<TripSettlementDto> => {
  const trip = toTripDto(await loadTrip(tripId));
  const expenses = await listTripExpenses(tripId);
  const totals = computeTripSettlement({
    price: trip.price,
    expenses,
    drivers: trip.drivers,
  });

  return {
    tripId,
    paidAt: trip.paidAt,
    carrierId: trip.carrierId,
    carrier: trip.carrier,
    revenue: totals.revenue,
    expenses,
    expensesTotal: totals.expensesTotal,
    byCategory: totals.byCategory,
    drivers: trip.drivers,
    perDiemTotal: totals.perDiemTotal,
    advanceTotal: totals.advanceTotal,
    netResult: totals.netResult,
  };
};

export const updateTripSettlement = async (
  tripId: string,
  input: TripSettlementWriteRequest,
): Promise<TripSettlementDto> => {
  await loadTrip(tripId);
  await assertCarrierExists(input.carrierId);

  if (input.drivers) {
    if (input.drivers.length > 0) {
      const assigned = await prisma.tripDriver.findMany({
        where: { tripId },
        select: { driverId: true },
      });
      const assignedIds = new Set(assigned.map((row) => row.driverId));
      const unknown = input.drivers.find((driver) => !assignedIds.has(driver.driverId));

      if (unknown) {
        throw badRequest('Dnevnica se može uneti samo za vozača koji je na ovoj vožnji.');
      }

      await prisma.$transaction(
        input.drivers.map((driver) =>
          prisma.tripDriver.update({
            where: { tripId_driverId: { tripId, driverId: driver.driverId } },
            data: { perDiemAmount: driver.perDiemAmount, advanceAmount: driver.advanceAmount },
          }),
        ),
      );
    }
  }

  await prisma.trip.update({
    where: { id: tripId },
    data: {
      paidAt: input.paidAt ? parseDate(input.paidAt) : null,
      carrierId: input.carrierId,
    },
  });

  logger.info('Trip settlement updated', { tripId });

  return getTripSettlement(tripId);
};
