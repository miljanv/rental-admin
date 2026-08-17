import type {
  DeleteTripResult,
  ListTripsQuery,
  PaginationMeta,
  TripDto,
  TripSortField,
  TripStatsDto,
  TripStatsQueryRequest,
  TripWriteRequest,
} from '@rental-admin/shared';
import { buildTripStats, defaultTripStatsRange } from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { badRequest, notFound } from '../utils/app-error';
import { buildPaginationMeta } from '../utils/api-response';
import { toTripDto, type TripRecord } from '../utils/trip-mapper';
import { logger } from '../utils/logger';
import { deleteAttachedFile } from './file-attachment.service';
import { deleteOperationalTransaction } from './transaction.service';

type SortOrder = ListTripsQuery['sortOrder'];
type TripOrderBy = Partial<Record<TripSortField, SortOrder>>;

export const parseDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

export const tripInclude = {
  partner: { select: { id: true, type: true, companyName: true, firstName: true, lastName: true } },
  carrier: { select: { id: true, type: true, companyName: true, firstName: true, lastName: true } },
  contract: { select: { id: true, origin: true, destination: true } },
  vehicles: { include: { vehicle: { select: { id: true, make: true, model: true, licensePlate: true } } } },
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
    const partner = await prisma.partner.findUnique({ where: { id: input.partnerId }, select: { id: true } });
    if (!partner) {
      throw badRequest('Izabrani partner ne postoji.');
    }
  }

  if (input.contractId) {
    const contract = await prisma.contract.findUnique({ where: { id: input.contractId }, select: { id: true } });
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
  const existing = await tx.tripDriver.findMany({ where: { tripId }, select: { driverId: true } });
  const existingIds = new Set(existing.map((row) => row.driverId));

  await tx.tripDriver.deleteMany({
    where: { tripId, driverId: { notIn: driverIds } },
  });

  const toCreate = driverIds.filter((driverId) => !existingIds.has(driverId));

  if (toCreate.length > 0) {
    await tx.tripDriver.createMany({
      data: toCreate.map((driverId) => ({ tripId, driverId })),
    });
  }
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

  logger.info('Trip updated', { tripId: id });

  return toTripDto(record);
};

export const deleteTrip = async (id: string): Promise<DeleteTripResult> => {
  await getTrip(id);

  const expenses = await prisma.tripExpense.findMany({
    where: { tripId: id },
    select: { id: true, fileId: true },
  });

  await Promise.all(
    expenses.map(async (expense) => {
      await deleteOperationalTransaction('TRIP_EXPENSE', expense.id);
      await deleteAttachedFile(expense.fileId);
    }),
  );

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
