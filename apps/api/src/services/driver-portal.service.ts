import {
  DRIVER_KM_JUMP_WARNING,
  DRIVER_PORTAL_DAYS_AHEAD,
  DRIVER_PORTAL_DAYS_BACK,
  isDriverReceiptMimeType,
  tripClientDisplayName,
  tripVehicleDistanceKm,
  type DriverPortalExpenseDto,
  type DriverPortalFileDto,
  type DriverPortalMeDto,
  type DriverPortalReportDto,
  type DriverPortalReportResultDto,
  type DriverPortalTripDto,
  type DriverPortalTripListDto,
  type DriverPortalUploadDto,
  type DriverReportExpenseRequest,
  type DriverReportStatus,
  type DriverReportWriteRequest,
  type PartnerType,
  type PresignUploadRequest,
  type TripExpenseCategory,
  type TripExpensePaymentMethod,
  type TripVehicleKmRequest,
} from '@rental-admin/shared';

import { prisma, prismaUnscoped } from '../config/prisma';
import { badRequest, conflict, notFound, unsupportedMediaType } from '../utils/app-error';
import { logger } from '../utils/logger';
import { requireOrganizationId } from '../utils/tenant-context';
import { recordAuditEvent } from './audit.service';
import { deleteAttachedFile } from './file-attachment.service';
import * as fileService from './file.service';
import { applyTripVehicleKm } from './trip-vehicle-km.service';

const TIME_ZONE = 'Europe/Belgrade';
/** A receipt has to be confirmed soon after its upload was started. */
const RECEIPT_CONFIRM_WINDOW_MS = 60 * 60 * 1000;
const HIDDEN_TRIP_STATUSES = ['CANCELLED', 'FREE'] as const;

/** Today's calendar date where the drivers are, as `yyyy-mm-dd`. */
export const portalTodayIso = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

const addDays = (isoDate: string, days: number): string => {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const toDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);
const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

const kmFormatter = new Intl.NumberFormat('sr-RS', { maximumFractionDigits: 1 });

const reportSelect = {
  id: true,
  status: true,
  note: true,
  adminComment: true,
  submittedAt: true,
  updatedAt: true,
  reviewedAt: true,
  expenses: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      category: true,
      amount: true,
      paymentMethod: true,
      note: true,
      status: true,
      fileId: true,
      file: { select: { id: true, originalName: true } },
    },
  },
} as const;

const tripSelect = (driverId: string) =>
  ({
    id: true,
    departureDate: true,
    returnDate: true,
    origin: true,
    destination: true,
    clientName: true,
    partner: { select: { type: true, companyName: true, firstName: true, lastName: true } },
    vehicles: {
      orderBy: { createdAt: 'asc' as const },
      select: {
        startKm: true,
        endKm: true,
        vehicle: { select: { id: true, licensePlate: true, make: true, model: true } },
      },
    },
    driverReports: { where: { driverId }, select: reportSelect },
  }) as const;

interface PortalExpenseRecord {
  id: string;
  category: TripExpenseCategory;
  amount: number;
  paymentMethod: TripExpensePaymentMethod;
  note: string | null;
  status: DriverPortalExpenseDto['status'];
  fileId: string | null;
  file: { id: string; originalName: string } | null;
}

interface PortalReportRecord {
  id: string;
  status: DriverReportStatus;
  note: string | null;
  adminComment: string | null;
  submittedAt: Date;
  updatedAt: Date;
  reviewedAt: Date | null;
  expenses: PortalExpenseRecord[];
}

interface PortalTripRecord {
  id: string;
  departureDate: Date;
  returnDate: Date | null;
  origin: string;
  destination: string;
  clientName: string | null;
  partner: {
    type: PartnerType;
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  vehicles: Array<{
    startKm: number | null;
    endKm: number | null;
    vehicle: { id: string; licensePlate: string; make: string; model: string };
  }>;
  driverReports: PortalReportRecord[];
}

const toReportDto = (report: PortalReportRecord): DriverPortalReportDto => ({
  id: report.id,
  status: report.status,
  note: report.note,
  adminComment: report.adminComment,
  submittedAt: report.submittedAt.toISOString(),
  updatedAt: report.updatedAt.toISOString(),
  reviewedAt: report.reviewedAt?.toISOString() ?? null,
  expenses: report.expenses.map((expense) => ({
    id: expense.id,
    category: expense.category,
    amount: expense.amount,
    paymentMethod: expense.paymentMethod,
    note: expense.note,
    file: expense.file,
    status: expense.status,
  })),
});

export const toPortalTripDto = (
  record: PortalTripRecord,
  today: string,
  lastKnownKm: ReadonlyMap<string, number | null> = new Map(),
): DriverPortalTripDto => {
  const report = record.driverReports[0];
  const clientName = tripClientDisplayName({
    partner: record.partner ? { id: '', ...record.partner } : null,
    clientName: record.clientName,
  });

  return {
    id: record.id,
    departureDate: toIsoDate(record.departureDate),
    returnDate: record.returnDate ? toIsoDate(record.returnDate) : null,
    origin: record.origin,
    destination: record.destination,
    clientName: clientName || null,
    vehicles: record.vehicles.map((assignment) => ({
      id: assignment.vehicle.id,
      licensePlate: assignment.vehicle.licensePlate,
      make: assignment.vehicle.make,
      model: assignment.vehicle.model,
      startKm: assignment.startKm,
      endKm: assignment.endKm,
      distanceKm: tripVehicleDistanceKm(assignment.startKm, assignment.endKm),
      lastKnownKm: lastKnownKm.get(assignment.vehicle.id) ?? null,
    })),
    report: report ? toReportDto(report) : null,
    canSubmit: toIsoDate(record.departureDate) <= today,
  };
};

/** Trips of this driver that touch the portal window: a week back to a week ahead. */
const portalTripWhere = (driverId: string, today: string) => {
  const from = toDate(addDays(today, -DRIVER_PORTAL_DAYS_BACK));
  const to = toDate(addDays(today, DRIVER_PORTAL_DAYS_AHEAD));

  return {
    drivers: { some: { driverId } },
    status: { notIn: [...HIDDEN_TRIP_STATUSES] },
    departureDate: { lte: to },
    OR: [{ departureDate: { gte: from } }, { returnDate: { gte: from } }],
  };
};

export type PortalTripGroup = keyof DriverPortalTripListDto;

/** Which section of the driver's list a trip belongs in. */
export const portalTripGroup = (trip: DriverPortalTripDto, today: string): PortalTripGroup => {
  if (trip.departureDate > today) {
    return 'upcoming';
  }

  if ((trip.returnDate ?? trip.departureDate) >= today) {
    return 'today';
  }

  return !trip.report || trip.report.status === 'RETURNED' ? 'pending' : 'submitted';
};

export const getDriverPortalMe = async (
  driverId: string,
  organizationId: string,
): Promise<DriverPortalMeDto> => {
  const [driver, organization] = await Promise.all([
    prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, firstName: true, lastName: true },
    }),
    prismaUnscoped.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    }),
  ]);

  if (!driver || !organization) {
    throw notFound('Vozač nije pronađen.');
  }

  return { driver, organizationName: organization.name };
};

export const listDriverPortalTrips = async (
  driverId: string,
  now: Date = new Date(),
): Promise<DriverPortalTripListDto> => {
  const today = portalTodayIso(now);
  const records = await prisma.trip.findMany({
    where: portalTripWhere(driverId, today),
    orderBy: [{ departureDate: 'asc' }, { createdAt: 'asc' }],
    select: tripSelect(driverId),
  });
  const groups: DriverPortalTripListDto = { today: [], pending: [], submitted: [], upcoming: [] };

  for (const record of records) {
    const trip = toPortalTripDto(record, today);
    groups[portalTripGroup(trip, today)].push(trip);
  }

  // Most recent finished trips first; today and upcoming stay in calendar order.
  groups.pending.reverse();
  groups.submitted.reverse();

  return groups;
};

const loadPortalTrip = async (
  driverId: string,
  tripId: string,
  today: string,
): Promise<PortalTripRecord> => {
  const record = await prisma.trip.findFirst({
    where: { id: tripId, ...portalTripWhere(driverId, today) },
    select: tripSelect(driverId),
  });

  if (!record) {
    throw notFound('Vožnja nije pronađena.');
  }

  return record;
};

const maxOf = (values: ReadonlyArray<number | null | undefined>): number | null => {
  const known = values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value),
  );
  return known.length === 0 ? null : Math.max(...known);
};

/**
 * Highest odometer reading of a vehicle known up to the trip's date, from
 * other trips, fuel logs, maintenance and its starting mileage.
 */
export const lastKnownOdometerKm = async (
  vehicleId: string,
  tripId: string,
  upTo: Date,
): Promise<number | null> => {
  const [trips, fuel, maintenance, vehicle] = await Promise.all([
    prisma.tripVehicle.aggregate({
      where: { vehicleId, tripId: { not: tripId }, trip: { departureDate: { lte: upTo } } },
      _max: { startKm: true, endKm: true },
    }),
    prisma.fuelLog.aggregate({
      where: { vehicleId, fueledAt: { lte: upTo } },
      _max: { odometerKm: true },
    }),
    prisma.vehicleMaintenance.aggregate({
      where: { vehicleId, date: { lte: upTo } },
      _max: { odometerKm: true },
    }),
    prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { initialMileageKm: true } }),
  ]);

  return maxOf([
    trips._max.startKm,
    trips._max.endKm,
    fuel._max.odometerKm,
    maintenance._max.odometerKm,
    vehicle?.initialMileageKm,
  ]);
};

const loadLastKnownKm = async (record: PortalTripRecord): Promise<Map<string, number | null>> => {
  const entries = await Promise.all(
    record.vehicles.map(
      async (assignment) =>
        [
          assignment.vehicle.id,
          await lastKnownOdometerKm(assignment.vehicle.id, record.id, record.departureDate),
        ] as const,
    ),
  );

  return new Map(entries);
};

export const getDriverPortalTrip = async (
  driverId: string,
  tripId: string,
  now: Date = new Date(),
): Promise<DriverPortalTripDto> => {
  const today = portalTodayIso(now);
  const record = await loadPortalTrip(driverId, tripId, today);

  return toPortalTripDto(record, today, await loadLastKnownKm(record));
};

/** Readings that are saved but look like a typo, for the driver to double-check. */
export const odometerWarnings = (
  readings: ReadonlyArray<TripVehicleKmRequest>,
  plates: ReadonlyMap<string, string>,
  lastKnownKm: ReadonlyMap<string, number | null>,
): string[] =>
  readings.flatMap((reading) => {
    const lastKnown = lastKnownKm.get(reading.vehicleId) ?? null;
    const plate = plates.get(reading.vehicleId) ?? 'Vozilo';

    if (reading.startKm === null || lastKnown === null) {
      return [];
    }

    if (reading.startKm < lastKnown) {
      return [
        `${plate}: početna kilometraža je manja od poslednje poznate (${kmFormatter.format(lastKnown)} km).`,
      ];
    }

    if (reading.startKm - lastKnown > DRIVER_KM_JUMP_WARNING) {
      return [
        `${plate}: početna kilometraža je za više od ${kmFormatter.format(DRIVER_KM_JUMP_WARNING)} km veća od poslednje poznate (${kmFormatter.format(lastKnown)} km).`,
      ];
    }

    return [];
  });

/**
 * A driver fills in what they know; an empty field never wipes a reading that
 * is already on the trip. The result must still be consistent.
 */
export const mergeDriverReadings = (
  readings: ReadonlyArray<TripVehicleKmRequest>,
  current: ReadonlyMap<string, { startKm: number | null; endKm: number | null }>,
  plates: ReadonlyMap<string, string>,
): TripVehicleKmRequest[] =>
  readings
    .filter((reading) => reading.startKm !== null || reading.endKm !== null)
    .map((reading) => {
      const existing = current.get(reading.vehicleId);

      if (!existing) {
        throw badRequest('Vozilo nije dodeljeno ovoj vožnji.');
      }

      const merged = {
        vehicleId: reading.vehicleId,
        startKm: reading.startKm ?? existing.startKm,
        endKm: reading.endKm ?? existing.endKm,
      };

      if (merged.startKm !== null && merged.endKm !== null && merged.endKm < merged.startKm) {
        throw badRequest(
          `${plates.get(reading.vehicleId) ?? 'Vozilo'}: završna kilometraža ne može biti manja od početne.`,
        );
      }

      return merged;
    });

const sameExpense = (current: PortalExpenseRecord, next: DriverReportExpenseRequest): boolean =>
  current.category === next.category &&
  current.amount === next.amount &&
  current.paymentMethod === next.paymentMethod &&
  (current.note ?? null) === next.note &&
  (current.fileId ?? null) === next.fileId;

const assertReceipt = async (fileId: string): Promise<void> => {
  const file = await prisma.fileObject.findUnique({
    where: { id: fileId },
    select: { status: true, mimeType: true },
  });

  if (!file || file.status !== 'UPLOADED' || !isDriverReceiptMimeType(file.mimeType)) {
    throw badRequest('Račun nije pronađen ili slanje slike nije završeno. Pokušajte ponovo.');
  }
};

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';

const expenseData = (expense: DriverReportExpenseRequest) => ({
  category: expense.category,
  amount: expense.amount,
  paymentMethod: expense.paymentMethod,
  note: expense.note,
  fileId: expense.fileId,
});

/**
 * Saves what the driver sent for a trip. Odometer readings go onto the trip's
 * vehicles right away; expenses are stored as PENDING and wait for the office.
 * An expense the office already handled cannot be changed.
 */
export const submitDriverReport = async (
  driverId: string,
  tripId: string,
  input: DriverReportWriteRequest,
  now: Date = new Date(),
): Promise<DriverPortalReportResultDto> => {
  const today = portalTodayIso(now);
  const trip = await loadPortalTrip(driverId, tripId, today);

  if (toIsoDate(trip.departureDate) > today) {
    throw badRequest('Podaci se unose na dan vožnje ili posle nje.');
  }

  const plates = new Map(trip.vehicles.map((row) => [row.vehicle.id, row.vehicle.licensePlate]));
  const currentKm = new Map(
    trip.vehicles.map((row) => [row.vehicle.id, { startKm: row.startKm, endKm: row.endKm }]),
  );
  const readings = mergeDriverReadings(input.vehicles, currentKm, plates);

  for (const fileId of input.expenses.map((expense) => expense.fileId)) {
    if (fileId) {
      await assertReceipt(fileId);
    }
  }

  const lastKnownKm = await loadLastKnownKm(trip);
  const warnings = odometerWarnings(readings, plates, lastKnownKm);
  const existing = trip.driverReports[0] ?? null;
  const existingById = new Map(existing?.expenses.map((expense) => [expense.id, expense]) ?? []);
  const keptIds = new Set<string>();
  const updates: Array<{ id: string; expense: DriverReportExpenseRequest }> = [];
  const creates: DriverReportExpenseRequest[] = [];

  for (const expense of input.expenses) {
    if (!expense.id) {
      creates.push(expense);
      continue;
    }

    const current = existingById.get(expense.id);

    if (!current) {
      throw badRequest('Trošak nije pronađen. Osvežite stranicu i pokušajte ponovo.');
    }

    keptIds.add(expense.id);

    if (current.status !== 'PENDING') {
      if (!sameExpense(current, expense)) {
        throw badRequest('Trošak koji je kancelarija već obradila više se ne može menjati.');
      }

      continue;
    }

    if (!sameExpense(current, expense)) {
      updates.push({ id: expense.id, expense });
    }
  }

  // Only expenses still waiting can be dropped by the driver; handled ones stay.
  const removed =
    existing?.expenses.filter(
      (expense) => expense.status === 'PENDING' && !keptIds.has(expense.id),
    ) ?? [];
  const hasPending =
    creates.length > 0 || [...keptIds].some((id) => existingById.get(id)?.status === 'PENDING');
  const status: DriverReportStatus =
    !existing || hasPending || existing.status === 'RETURNED' ? 'SUBMITTED' : existing.status;

  const usedFileIds = new Set(
    input.expenses.map((expense) => expense.fileId).filter((id): id is string => Boolean(id)),
  );
  const orphanedFileIds = [
    ...removed.map((expense) => expense.fileId),
    ...updates.map(({ id }) => existingById.get(id)?.fileId ?? null),
  ].filter((id): id is string => Boolean(id) && !usedFileIds.has(id as string));

  try {
    await prisma.$transaction(async (tx) => {
      const report = existing
        ? await tx.driverTripReport.update({
            where: { id: existing.id },
            data: {
              note: input.note,
              status,
              ...(status === 'SUBMITTED' ? { submittedAt: now } : {}),
            },
            select: { id: true },
          })
        : await tx.driverTripReport.create({
            data: {
              organizationId: requireOrganizationId(),
              tripId,
              driverId,
              note: input.note,
              status: 'SUBMITTED',
            },
            select: { id: true },
          });

      if (removed.length > 0) {
        await tx.driverTripReportExpense.deleteMany({
          where: { reportId: report.id, id: { in: removed.map((expense) => expense.id) } },
        });
      }

      for (const { id, expense } of updates) {
        await tx.driverTripReportExpense.update({ where: { id }, data: expenseData(expense) });
      }

      for (const expense of creates) {
        await tx.driverTripReportExpense.create({
          data: { reportId: report.id, ...expenseData(expense) },
        });
      }

      for (const reading of readings) {
        await tx.driverTripReportVehicle.upsert({
          where: { reportId_vehicleId: { reportId: report.id, vehicleId: reading.vehicleId } },
          create: {
            reportId: report.id,
            vehicleId: reading.vehicleId,
            startKm: reading.startKm,
            endKm: reading.endKm,
          },
          update: { startKm: reading.startKm, endKm: reading.endKm },
        });
      }

      if (readings.length > 0) {
        await applyTripVehicleKm(tripId, readings, 'DRIVER', tx);
      }
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('Isti račun je već priložen uz drugi trošak.');
    }

    throw error;
  }

  await Promise.all(orphanedFileIds.map((fileId) => deleteAttachedFile(fileId)));

  logger.info('Driver report submitted', {
    tripId,
    driverId,
    expenses: input.expenses.length,
    vehicles: readings.length,
  });
  await recordAuditEvent({
    action: 'DRIVER_REPORT_SUBMITTED',
    entityType: 'Trip',
    entityId: tripId,
    actorUserId: null,
    metadata: { driverId, expenseCount: input.expenses.length, vehicleCount: readings.length },
  });

  return { trip: await getDriverPortalTrip(driverId, tripId, now), warnings };
};

/** Starts a direct-to-S3 upload of a receipt photo or scan. */
export const createReceiptUpload = async (
  input: PresignUploadRequest,
): Promise<DriverPortalUploadDto> => {
  if (!isDriverReceiptMimeType(input.mimeType)) {
    throw unsupportedMediaType('Priložite sliku računa (JPG, PNG, WEBP) ili PDF.');
  }

  const result = await fileService.createPresignedUpload(input);

  return { fileId: result.fileId, uploadUrl: result.uploadUrl, expiresIn: result.expiresIn };
};

/** Confirms a receipt upload. Only a receipt started from the portal within the last hour. */
export const confirmReceiptUpload = async (
  fileId: string,
  now: Date = new Date(),
): Promise<DriverPortalFileDto> => {
  const record = await prisma.fileObject.findUnique({
    where: { id: fileId },
    select: { mimeType: true, createdAt: true },
  });

  if (
    !record ||
    !isDriverReceiptMimeType(record.mimeType) ||
    now.getTime() - record.createdAt.getTime() > RECEIPT_CONFIRM_WINDOW_MS
  ) {
    throw notFound('Račun nije pronađen.');
  }

  const file = await fileService.confirmUpload(fileId);

  return { id: file.id, originalName: file.originalName };
};
