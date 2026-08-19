import {
  buildTripStats,
  defaultTripStatsRange,
  tripClientDisplayName,
  tripRouteLabel,
  type DeleteTripResult,
  type ListTripsQuery,
  type PaginationMeta,
  type TripDto,
  type TripSortField,
  type TripStatsDto,
  type TripStatsQueryRequest,
  type TripWriteRequest,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { badRequest, notFound } from '../utils/app-error';
import { buildPaginationMeta } from '../utils/api-response';
import { toTripDto, type TripRecord } from '../utils/trip-mapper';
import { logger } from '../utils/logger';
import { deleteAttachedFile } from './file-attachment.service';
import { deleteOperationalTransaction, upsertOperationalIncome } from './transaction.service';

type SortOrder = ListTripsQuery['sortOrder'];
type TripOrderBy = Partial<Record<TripSortField, SortOrder>>;

export const parseDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

export const tripInclude = {
  partner: { select: { id: true, type: true, companyName: true, firstName: true, lastName: true } },
  carrier: { select: { id: true, type: true, companyName: true, firstName: true, lastName: true } },
  contract: { select: { id: true, origin: true, destination: true } },
  vehicles: {
    include: { vehicle: { select: { id: true, make: true, model: true, licensePlate: true } } },
  },
  drivers: { include: { driver: { select: { id: true, firstName: true, lastName: true } } } },
} as const;

type TripListFilters = Omit<ListTripsQuery, 'page' | 'limit' | 'sortBy' | 'sortOrder'>;

const tripListWhere = (query: TripListFilters) => ({
  ...(query.status ? { status: query.status } : {}),
  ...(query.vehicleId ? { vehicles: { some: { vehicleId: query.vehicleId } } } : {}),
  ...(query.driverId ? { drivers: { some: { driverId: query.driverId } } } : {}),
  ...(query.partnerId ? { partnerId: query.partnerId } : {}),
  ...(query.country ? { country: { contains: query.country, mode: 'insensitive' as const } } : {}),
  ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
  ...(query.seriesId ? { seriesId: query.seriesId } : {}),
  ...(query.from || query.to
    ? {
        departureDate: {
          ...(query.from ? { gte: parseDate(query.from) } : {}),
          ...(query.to ? { lte: parseDate(query.to) } : {}),
        },
      }
    : {}),
  ...(query.search
    ? {
        OR: [
          { referenceNumber: { contains: query.search, mode: 'insensitive' as const } },
          { origin: { contains: query.search, mode: 'insensitive' as const } },
          { destination: { contains: query.search, mode: 'insensitive' as const } },
          { clientName: { contains: query.search, mode: 'insensitive' as const } },
          { notes: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }
    : {}),
});

export const assertVehiclesExist = async (vehicleIds: string[]): Promise<void> => {
  if (vehicleIds.length === 0) {
    return;
  }

  const count = await prisma.vehicle.count({ where: { id: { in: vehicleIds } } });

  if (count !== new Set(vehicleIds).size) {
    throw badRequest('Neko od izabranih vozila ne postoji.');
  }
};

export const assertDriversExist = async (driverIds: string[]): Promise<void> => {
  if (driverIds.length === 0) {
    return;
  }

  const count = await prisma.driver.count({ where: { id: { in: driverIds } } });

  if (count !== new Set(driverIds).size) {
    throw badRequest('Neko od izabranih vozača ne postoji.');
  }
};

const assertReferencesExist = async (input: TripWriteRequest): Promise<void> => {
  if (input.partnerId) {
    const partner = await prisma.partner.findUnique({
      where: { id: input.partnerId },
      select: { id: true },
    });
    if (!partner) {
      throw badRequest('Izabrani partner ne postoji.');
    }
  }

  if (input.contractId) {
    const contract = await prisma.contract.findUnique({
      where: { id: input.contractId },
      select: { id: true },
    });
    if (!contract) {
      throw badRequest('Izabrani ugovor ne postoji.');
    }
  }

  await assertVehiclesExist(input.vehicleIds);
  await assertDriversExist(input.driverIds);
};

const syncTripDrivers = async (
  tx: Pick<typeof prisma, 'tripDriver'>,
  tripId: string,
  driverIds: string[],
): Promise<void> => {
  const existing = await tx.tripDriver.findMany({ where: { tripId } });
  const existingIds = new Set(existing.map((row) => row.driverId));
  const removed = existing.filter((row) => !driverIds.includes(row.driverId));

  await tx.tripDriver.deleteMany({
    where: { tripId, driverId: { notIn: driverIds } },
  });

  // A dropped driver's per-diem/advance Finance rows would otherwise point
  // at a TripDriver id that no longer exists.
  await Promise.all(
    removed.flatMap((row) => [
      deleteOperationalTransaction('TRIP_DRIVER_PER_DIEM', row.id),
      deleteOperationalTransaction('TRIP_DRIVER_ADVANCE', row.id),
    ]),
  );

  const toCreate = driverIds.filter((driverId) => !existingIds.has(driverId));

  if (toCreate.length > 0) {
    await tx.tripDriver.createMany({
      data: toCreate.map((driverId) => ({ tripId, driverId })),
    });
  }
};

/**
 * Posts/updates/removes the trip's own INCOME row — only once it's actually
 * marked paid (`paidAt`), so Finance reflects real cash flow instead of every
 * planned-but-unpaid trip's full price.
 */
export const syncTripRevenue = async (trip: TripDto): Promise<void> => {
  await upsertOperationalIncome({
    sourceType: 'TRIP_REVENUE',
    sourceId: trip.id,
    category: 'CONTRACT',
    amount: trip.paidAt ? trip.price : null,
    paymentMethod: trip.paymentMethod,
    occurredAt: trip.paidAt ?? trip.departureDate,
    vehicleId: trip.vehicles[0]?.id ?? null,
    partner: tripClientDisplayName(trip) || null,
    route: tripRouteLabel(trip),
    note: trip.referenceNumber
      ? `Vožnja ${trip.referenceNumber}`
      : `Vožnja ${tripRouteLabel(trip)}`,
  });
};

const toWriteData = (input: TripWriteRequest) => ({
  referenceNumber: input.referenceNumber,
  departureDate: parseDate(input.departureDate),
  returnDate: input.returnDate ? parseDate(input.returnDate) : null,
  country: input.country,
  origin: input.origin,
  destination: input.destination,
  passengerCount: input.passengerCount,
  partnerId: input.partnerId,
  clientName: input.clientName,
  notes: input.notes,
  price: input.price,
  paymentMethod: input.paymentMethod,
  status: input.status,
  contractId: input.contractId,
  distanceKm: input.distanceKm,
  vehicleCount: Math.max(input.vehicleCount, input.vehicleIds.length, 1),
});

export const listTrips = async (
  query: ListTripsQuery,
): Promise<{ trips: TripDto[]; pagination: PaginationMeta }> => {
  const orderBy: TripOrderBy = { [query.sortBy]: query.sortOrder };
  const where = tripListWhere(query);

  const [total, records] = await Promise.all([
    prisma.trip.count({ where }),
    prisma.trip.findMany({
      where,
      include: tripInclude,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    trips: records.map((record: TripRecord) => toTripDto(record)),
    pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
  };
};

export const getTrip = async (id: string): Promise<TripDto> => {
  const record = await prisma.trip.findUnique({ where: { id }, include: tripInclude });

  if (!record) {
    throw notFound('Vožnja nije pronađena.');
  }

  return toTripDto(record);
};

export const createTrip = async (input: TripWriteRequest): Promise<TripDto> => {
  await assertReferencesExist(input);

  const record = await prisma.$transaction(async (tx) => {
    const trip = await tx.trip.create({ data: toWriteData(input) });

    if (input.vehicleIds.length > 0) {
      await tx.tripVehicle.createMany({
        data: input.vehicleIds.map((vehicleId) => ({ tripId: trip.id, vehicleId })),
      });
    }

    if (input.driverIds.length > 0) {
      await tx.tripDriver.createMany({
        data: input.driverIds.map((driverId) => ({ tripId: trip.id, driverId })),
      });
    }

    return tx.trip.findUniqueOrThrow({ where: { id: trip.id }, include: tripInclude });
  });

  logger.info('Trip created', { tripId: record.id, referenceNumber: record.referenceNumber });

  return toTripDto(record);
};

export const updateTrip = async (id: string, input: TripWriteRequest): Promise<TripDto> => {
  await getTrip(id);
  await assertReferencesExist(input);

  const record = await prisma.$transaction(async (tx) => {
    await tx.trip.update({ where: { id }, data: toWriteData(input) });
    await tx.tripVehicle.deleteMany({ where: { tripId: id } });

    if (input.vehicleIds.length > 0) {
      await tx.tripVehicle.createMany({
        data: input.vehicleIds.map((vehicleId) => ({ tripId: id, vehicleId })),
      });
    }

    await syncTripDrivers(tx, id, input.driverIds);

    return tx.trip.findUniqueOrThrow({ where: { id }, include: tripInclude });
  });

  const trip = toTripDto(record);
  // Price/paymentMethod live on this form too — if the trip is already
  // marked paid, keep its posted revenue in sync instead of leaving it stale.
  await syncTripRevenue(trip);

  logger.info('Trip updated', { tripId: id });

  return trip;
};

export const deleteTrip = async (id: string): Promise<DeleteTripResult> => {
  await getTrip(id);

  const [expenses, tripDrivers] = await Promise.all([
    prisma.tripExpense.findMany({ where: { tripId: id }, select: { id: true, fileId: true } }),
    prisma.tripDriver.findMany({ where: { tripId: id }, select: { id: true } }),
  ]);

  await Promise.all([
    ...expenses.map(async (expense) => {
      await deleteOperationalTransaction('TRIP_EXPENSE', expense.id);
      await deleteAttachedFile(expense.fileId);
    }),
    ...tripDrivers.flatMap((tripDriver) => [
      deleteOperationalTransaction('TRIP_DRIVER_PER_DIEM', tripDriver.id),
      deleteOperationalTransaction('TRIP_DRIVER_ADVANCE', tripDriver.id),
    ]),
    deleteOperationalTransaction('TRIP_REVENUE', id),
  ]);

  // TripVehicle/TripDriver/TripExpense rows cascade automatically (onDelete: Cascade).
  await prisma.trip.delete({ where: { id } });
  logger.info('Trip deleted', { tripId: id });

  return { id, deleted: true };
};

export const getTripStats = async (query: TripStatsQueryRequest): Promise<TripStatsDto> => {
  const defaults = defaultTripStatsRange();
  const from = query.from ?? defaults.from;
  const to = query.to ?? defaults.to;

  const records = await prisma.trip.findMany({
    where: { departureDate: { gte: parseDate(from), lte: parseDate(to) } },
    select: {
      status: true,
      departureDate: true,
      origin: true,
      destination: true,
      price: true,
      paymentMethod: true,
      distanceKm: true,
      partnerId: true,
      clientName: true,
      partner: { select: { type: true, companyName: true, firstName: true, lastName: true } },
    },
  });

  return buildTripStats(
    records.map((record) => ({
      status: record.status,
      departureDate: toIsoDate(record.departureDate),
      origin: record.origin,
      destination: record.destination,
      price: record.price,
      paymentMethod: record.paymentMethod,
      distanceKm: record.distanceKm,
      partnerId: record.partnerId,
      partnerLabel: record.partner
        ? record.partner.type === 'INDIVIDUAL'
          ? `${record.partner.firstName ?? ''} ${record.partner.lastName ?? ''}`.trim()
          : (record.partner.companyName ?? null)
        : null,
      clientName: record.clientName,
    })),
    from,
    to,
  );
};
