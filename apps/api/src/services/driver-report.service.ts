import {
  canRecordFuelLog,
  DRIVER_PORTAL_DAYS_BACK,
  tripClientDisplayName,
  tripVehicleDistanceKm,
  type AcceptDriverReportRequest,
  type DriverReportAdminDto,
  type DriverReportMissingDto,
  type DriverReportPendingCountDto,
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
import { recordAuditEvent } from './audit.service';
import { addDays, portalTodayIso } from './driver-portal.service';
import { createFuelLog } from './fuel-log.service';
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
      vehicleId: expense.vehicleId,
      fuelLiters: expense.fuelLiters,
      fuelType: expense.fuelType,
      fuelOdometerKm: expense.fuelOdometerKm,
      fuelStation: expense.fuelStation,
      fuelLogId: expense.fuelLogId,
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
    ...(query.tripId ? { tripId: query.tripId } : {}),
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

/**
 * Records an accepted fuel expense in the fuel log as well, for consumption.
 * The money is already booked through the trip expense, so the fuel log entry
 * carries no cost. A failure here is logged and does not undo the acceptance.
 * Returns 1 when an entry was created.
 */
const recordFuelLog = async (
  report: ReportRecord,
  expense: ReportRecord['expenses'][number],
): Promise<number> => {
  if (!expense.vehicleId || expense.fuelLiters === null || expense.fuelOdometerKm === null) {
    return 0;
  }

  try {
    const fuelLog = await createFuelLog({
      vehicleId: expense.vehicleId,
      fueledAt: toIsoDate(report.trip.departureDate),
      location: expense.fuelStation ?? '',
      driverId: report.driverId,
      fuelType: expense.fuelType ?? 'DIESEL',
      litersFilled: expense.fuelLiters,
      odometerKm: expense.fuelOdometerKm,
      cost: null,
      paymentMethod: null,
      supplier: expense.fuelStation ?? 'Pumpa (unos vozača)',
      note: 'Iz unosa vozača; trošak je knjižen na vožnji.',
    });

    await prisma.driverTripReportExpense.update({
      where: { id: expense.id },
      data: { fuelLogId: fuelLog.id },
    });

    return 1;
  } catch (error) {
    logger.error('Fuel log from a driver report not recorded', error, {
      reportId: report.id,
      expenseId: expense.id,
    });

    return 0;
  }
};

export const countPendingDriverReports = async (): Promise<DriverReportPendingCountDto> => ({
  count: await prisma.driverTripReport.count({ where: { status: 'SUBMITTED' } }),
});

/**
 * Finished trips of the last week where an assigned driver has a portal link
 * but sent nothing yet, so the office knows whom to call.
 */
export const listMissingDriverReports = async (
  now: Date = new Date(),
): Promise<DriverReportMissingDto[]> => {
  const today = portalTodayIso(now);
  const rows = await prisma.tripDriver.findMany({
    where: {
      driver: { accessTokens: { some: { revokedAt: null } } },
      trip: {
        status: { notIn: ['CANCELLED', 'FREE'] },
        departureDate: {
          gte: new Date(`${addDays(today, -DRIVER_PORTAL_DAYS_BACK)}T00:00:00.000Z`),
          lte: new Date(`${addDays(today, -1)}T00:00:00.000Z`),
        },
      },
    },
    orderBy: { trip: { departureDate: 'desc' } },
    select: {
      driver: { select: { id: true, firstName: true, lastName: true } },
      trip: {
        select: {
          id: true,
          departureDate: true,
          returnDate: true,
          origin: true,
          destination: true,
          driverReports: { select: { driverId: true } },
        },
      },
    },
  });

  return rows
    .filter(
      (row) =>
        toIsoDate(row.trip.returnDate ?? row.trip.departureDate) < today &&
        !row.trip.driverReports.some((report) => report.driverId === row.driver.id),
    )
    .map((row) => ({
      tripId: row.trip.id,
      departureDate: toIsoDate(row.trip.departureDate),
      origin: row.trip.origin,
      destination: row.trip.destination,
      driver: row.driver,
    }));
};

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

    if (
      decision.accept &&
      decision.addFuelLog &&
      !canRecordFuelLog({ ...expense, category: decision.category ?? expense.category })
    ) {
      throw badRequest('Za upis u evidenciju goriva nedostaju vozilo, litri ili kilometraža.');
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

  let fuelLogs = 0;

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

      if (decision.addFuelLog) {
        fuelLogs += await recordFuelLog(report, expense);
      }
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

  const accepted = input.expenses.filter((entry) => entry.accept).length;
  const rejected = input.expenses.length - accepted;

  logger.info('Driver report reviewed', { reportId: id, accepted, rejected, fuelLogs });
  await recordAuditEvent({
    action: 'DRIVER_REPORT_ACCEPTED',
    entityType: 'Trip',
    entityId: report.tripId,
    metadata: { reportId: id, driverId: report.driverId, accepted, rejected, fuelLogs },
  });

  return getDriverReport(id);
};

/** Sends the report back to the driver with what to fix; pending expenses stay editable. */
export const returnDriverReport = async (
  id: string,
  input: ReturnDriverReportRequest,
): Promise<DriverReportAdminDto> => {
  const report = await loadReport(id);

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
  await recordAuditEvent({
    action: 'DRIVER_REPORT_RETURNED',
    entityType: 'Trip',
    entityId: report.tripId,
    metadata: { reportId: id, driverId: report.driverId },
  });

  return getDriverReport(id);
};
