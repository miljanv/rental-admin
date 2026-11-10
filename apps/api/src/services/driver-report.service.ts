import {
  tripClientDisplayName,
  tripVehicleDistanceKm,
  type AcceptDriverReportRequest,
  type DriverReportAdminDto,
  type DriverReportExpenseStatus,
  type DriverReportStatus,
  type ListDriverReportsQuery,
  type PaginationMeta,
  type ReturnDriverReportRequest,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { badRequest, conflict, notFound } from '../utils/app-error';
import { buildPaginationMeta } from '../utils/api-response';
import { logger } from '../utils/logger';
import { getTenantContext } from '../utils/tenant-context';
import { createTripExpense } from './trip-expense.service';

const reportInclude = {
  driver: { select: { id: true, firstName: true, lastName: true } },
  reviewedBy: { select: { id: true, username: true } },
  trip: {
    select: {
      id: true,
      departureDate: true,
      returnDate: true,
      origin: true,
      destination: true,
      clientName: true,
      partner: {
        select: { id: true, type: true, companyName: true, firstName: true, lastName: true },
      },
      vehicles: {
        select: {
          vehicleId: true,
          kmSource: true,
          vehicle: { select: { licensePlate: true } },
        },
      },
    },
  },
  vehicles: { select: { vehicleId: true, startKm: true, endKm: true } },
  expenses: {
    orderBy: { createdAt: 'asc' as const },
    include: { file: { select: { id: true, originalName: true, mimeType: true } } },
  },
} as const;

type ReportRecord = NonNullable<
  Awaited<ReturnType<typeof prisma.driverTripReport.findFirst<{ include: typeof reportInclude }>>>
>;

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

export const toDriverReportAdminDto = (record: ReportRecord): DriverReportAdminDto => {
  const plates = new Map(
    record.trip.vehicles.map((row) => [row.vehicleId, row.vehicle.licensePlate]),
  );
  const sources = new Map(record.trip.vehicles.map((row) => [row.vehicleId, row.kmSource]));
  const pending = record.expenses.filter((expense) => expense.status === 'PENDING');
  const clientName = tripClientDisplayName({
    partner: record.trip.partner,
    clientName: record.trip.clientName,
  });

  return {
    id: record.id,
    status: record.status,
    note: record.note,
    adminComment: record.adminComment,
    submittedAt: record.submittedAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    reviewedAt: record.reviewedAt?.toISOString() ?? null,
    reviewedBy: record.reviewedBy,
    driver: record.driver,
    trip: {
      id: record.trip.id,
      departureDate: toIsoDate(record.trip.departureDate),
      returnDate: record.trip.returnDate ? toIsoDate(record.trip.returnDate) : null,
      origin: record.trip.origin,
      destination: record.trip.destination,
      clientName: clientName || null,
    },
    vehicles: record.vehicles.map((row) => ({
      vehicleId: row.vehicleId,
      licensePlate: plates.get(row.vehicleId) ?? '—',
      startKm: row.startKm,
      endKm: row.endKm,
      distanceKm: tripVehicleDistanceKm(row.startKm, row.endKm),
      currentKmSource: sources.get(row.vehicleId) ?? null,
    })),
    expenses: record.expenses.map((expense) => ({
      id: expense.id,
      category: expense.category,
      amount: expense.amount,
      paymentMethod: expense.paymentMethod,
      note: expense.note,
      status: expense.status,
      file: expense.file,
      tripExpenseId: expense.tripExpenseId,
    })),
    pendingCount: pending.length,
    pendingTotal: Math.round(pending.reduce((sum, expense) => sum + expense.amount, 0) * 100) / 100,
  };
};

export const listDriverReports = async (
  query: ListDriverReportsQuery,
): Promise<{ reports: DriverReportAdminDto[]; pagination: PaginationMeta }> => {
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.driverId ? { driverId: query.driverId } : {}),
    ...(query.from || query.to
      ? {
          trip: {
            departureDate: {
              ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
              ...(query.to ? { lte: new Date(`${query.to}T00:00:00.000Z`) } : {}),
            },
          },
        }
      : {}),
  };

  const [total, records] = await Promise.all([
    prisma.driverTripReport.count({ where }),
    prisma.driverTripReport.findMany({
      where,
      include: reportInclude,
      orderBy: { submittedAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    reports: records.map(toDriverReportAdminDto),
    pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
  };
};

const loadReport = async (id: string): Promise<ReportRecord> => {
  const record = await prisma.driverTripReport.findFirst({ where: { id }, include: reportInclude });

  if (!record) {
    throw notFound('Unos vozača nije pronađen.');
  }

  return record;
};

export const getDriverReport = async (id: string): Promise<DriverReportAdminDto> =>
  toDriverReportAdminDto(await loadReport(id));

/** Status of a report from the state of its expenses after the office handled some. */
export const reviewedReportStatus = (
  statuses: ReadonlyArray<DriverReportExpenseStatus>,
): DriverReportStatus => {
  if (statuses.includes('PENDING')) {
    return 'SUBMITTED';
  }

  return statuses.includes('REJECTED') ? 'PARTIALLY_ACCEPTED' : 'ACCEPTED';
};

/**
 * Accepts or rejects the report's pending expenses. Each accepted one becomes
 * a trip expense (and, through it, a finance row) with the driver's receipt.
 * Expenses are claimed first, so a second click cannot create them twice; if
 * creating a trip expense fails, its claim is released.
 */
export const acceptDriverReport = async (
  id: string,
  input: AcceptDriverReportRequest,
): Promise<DriverReportAdminDto> => {
  const report = await loadReport(id);
  const byId = new Map(report.expenses.map((expense) => [expense.id, expense]));

  for (const decision of input.expenses) {
    const expense = byId.get(decision.id);

    if (!expense) {
      throw badRequest('Trošak ne pripada ovom unosu.');
    }

    if (expense.status !== 'PENDING') {
      throw conflict('Trošak je već obrađen. Osvežite stranicu.');
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const decision of input.expenses) {
      const claimed = await tx.driverTripReportExpense.updateMany({
        where: { id: decision.id, reportId: id, status: 'PENDING' },
        data: decision.accept
          ? {
              status: 'ACCEPTED',
              ...(decision.category ? { category: decision.category } : {}),
              ...(decision.amount !== undefined ? { amount: decision.amount } : {}),
              ...(decision.paymentMethod ? { paymentMethod: decision.paymentMethod } : {}),
            }
          : { status: 'REJECTED' },
      });

      if (claimed.count === 0) {
        throw conflict('Trošak je već obrađen. Osvežite stranicu.');
      }
    }
  });

  for (const decision of input.expenses.filter((entry) => entry.accept)) {
    const expense = byId.get(decision.id);

    if (!expense) {
      continue;
    }

    try {
      const created = await createTripExpense(report.tripId, {
        category: decision.category ?? expense.category,
        amount: decision.amount ?? expense.amount,
        paymentMethod: decision.paymentMethod ?? expense.paymentMethod,
        note: expense.note,
        fileId: expense.fileId,
      });

      await prisma.driverTripReportExpense.update({
        where: { id: expense.id },
        data: { tripExpenseId: created.id },
      });
    } catch (error) {
      await prisma.driverTripReportExpense
        .update({ where: { id: expense.id }, data: { status: 'PENDING' } })
        .catch(() => undefined);
      throw error;
    }
  }

  const statuses = await prisma.driverTripReportExpense.findMany({
    where: { reportId: id },
    select: { status: true },
  });

  await prisma.driverTripReport.update({
    where: { id },
    data: {
      status: reviewedReportStatus(statuses.map((row) => row.status)),
      adminComment: input.comment,
      reviewedAt: new Date(),
      reviewedById: getTenantContext()?.userId ?? null,
    },
  });

  logger.info('Driver report reviewed', {
    reportId: id,
    accepted: input.expenses.filter((entry) => entry.accept).length,
    rejected: input.expenses.filter((entry) => !entry.accept).length,
  });

  return getDriverReport(id);
};

/** Sends the report back to the driver with what to fix; pending expenses stay editable. */
export const returnDriverReport = async (
  id: string,
  input: ReturnDriverReportRequest,
): Promise<DriverReportAdminDto> => {
  await loadReport(id);

  await prisma.driverTripReport.update({
    where: { id },
    data: {
      status: 'RETURNED',
      adminComment: input.comment,
      reviewedAt: new Date(),
      reviewedById: getTenantContext()?.userId ?? null,
    },
  });

  logger.info('Driver report returned', { reportId: id });

  return getDriverReport(id);
};
