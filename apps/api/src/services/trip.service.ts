import {
  buildTripStats,
  computeSplitTransportFare,
  defaultTripStatsRange,
  invoiceMonthBounds,
  seriesInvoiceGroupId,
  tripClientDisplayName,
  tripRouteLabel,
  type DeleteTripResult,
  type ListTripsQuery,
  type PaginationMeta,
  type TransportVatResult,
  type TripDto,
  type TripInvoiceWriteRequest,
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

export const syncTripDrivers = async (
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
 * Posts the trip as an open customer receivable once it is invoiced.
 * `paidAt` settles that row; until a bank-statement import exists, marking
 * the trip paid is what closes it.
 */
const invoiceNote = (trip: TripDto, extra?: string): string => {
  const parts = [
    trip.referenceNumber ? `Vožnja ${trip.referenceNumber}` : `Vožnja ${tripRouteLabel(trip)}`,
    trip.invoiceDescription,
    extra ?? null,
  ].filter((part): part is string => Boolean(part));

  return parts.join(' · ');
};

export const syncTripRevenue = async (trip: TripDto): Promise<void> => {
  if (trip.invoiceGroupId) {
    await deleteOperationalTransaction('TRIP_REVENUE', trip.id);
    return;
  }

  const isBooked = Boolean(trip.invoicedAt || trip.paidAt);
  const amount = trip.invoiceGrossAmount ?? trip.price;

  await upsertOperationalIncome({
    sourceType: 'TRIP_REVENUE',
    sourceId: trip.id,
    category: 'CONTRACT',
    amount: isBooked ? amount : null,
    paymentMethod: trip.paymentMethod,
    occurredAt: trip.paidAt ?? trip.invoicedAt ?? trip.departureDate,
    vehicleId: trip.vehicles[0]?.id ?? null,
    partner: tripClientDisplayName(trip) || null,
    route: tripRouteLabel(trip),
    note: invoiceNote(trip),
    status: trip.paidAt ? 'SETTLED' : 'OPEN',
  });
};

const syncSeriesInvoiceRevenue = async (groupId: string): Promise<void> => {
  const records = await prisma.trip.findMany({
    where: { invoiceGroupId: groupId },
    include: tripInclude,
    orderBy: { departureDate: 'asc' },
  });

  if (records.length === 0) {
    await deleteOperationalTransaction('TRIP_REVENUE', groupId);
    return;
  }

  const trips = records.map((record: TripRecord) => toTripDto(record));
  const head = trips[0];

  if (!head) {
    return;
  }

  const gross = Math.round(trips.reduce((sum, trip) => sum + (trip.invoiceGrossAmount ?? 0), 0) * 100) / 100;
  const allPaid = trips.every((trip) => trip.paidAt);

  await upsertOperationalIncome({
    sourceType: 'TRIP_REVENUE',
    sourceId: groupId,
    category: 'CONTRACT',
    amount: gross > 0 ? gross : null,
    paymentMethod: head.paymentMethod,
    occurredAt: head.paidAt ?? head.invoicedAt ?? head.departureDate,
    vehicleId: head.vehicles[0]?.id ?? null,
    partner: tripClientDisplayName(head) || null,
    route: tripRouteLabel(head),
    note: invoiceNote(head, `Serija, ${trips.length} dana`),
    status: allPaid ? 'SETTLED' : 'OPEN',
  });

  await Promise.all(trips.map((trip) => deleteOperationalTransaction('TRIP_REVENUE', trip.id)));
};

const fareForInvoice = (input: TripInvoiceWriteRequest): TransportVatResult =>
  computeSplitTransportFare({
    domesticAmount: input.domesticPrice ?? 0,
    domesticIncludesVat: input.priceIncludesVat,
    foreignAmount: input.foreignPrice ?? 0,
  });

const invoiceColumns = (input: TripInvoiceWriteRequest, fare: TransportVatResult, groupId: string | null) => ({
  price: fare.grossAmount,
  paymentMethod: input.paymentMethod,
  invoicedAt: parseDate(input.invoicedAt),
  referenceNumber: input.referenceNumber,
  invoiceDescription: input.description,
  priceIncludesVat: input.priceIncludesVat,
  invoiceDomesticAmount: input.domesticPrice,
  invoiceForeignAmount: input.foreignPrice,
  invoiceDomesticKm: null,
  invoiceTotalKm: null,
  invoiceNetAmount: fare.netAmount,
  invoiceVatAmount: fare.vatAmount,
  invoiceGrossAmount: fare.grossAmount,
  invoiceGroupId: groupId,
});

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

const invoiceSeriesMonth = async (
  trip: TripDto,
  input: TripInvoiceWriteRequest,
): Promise<TripDto> => {
  if (!trip.seriesId) {
    throw badRequest('Mesečna faktura važi samo za vožnju iz serije.');
  }

  const bounds = invoiceMonthBounds(trip.departureDate);
  const groupId = seriesInvoiceGroupId(trip.seriesId, trip.departureDate);
  const dayFare = fareForInvoice(input);
  const records = await prisma.trip.findMany({
    where: {
      seriesId: trip.seriesId,
      status: { notIn: ['CANCELLED', 'FREE'] },
      paidAt: null,
      departureDate: { gte: parseDate(bounds.from), lte: parseDate(bounds.to) },
    },
    select: { id: true },
  });

  if (records.length === 0) {
    throw badRequest('U tom mesecu nema neplaćenih vožnji ove serije.');
  }

  const monthGross = Math.round(dayFare.grossAmount * records.length * 100) / 100;

  await prisma.trip.updateMany({
    where: { id: { in: records.map((row) => row.id) } },
    data: {
      ...invoiceColumns(input, dayFare, groupId),
      invoiceDescription: input.description
        ? input.description
        : `Prevoz radnika ${bounds.from} – ${bounds.to}, ${records.length} dana`,
    },
  });

  await syncSeriesInvoiceRevenue(groupId);

  const saved = await getTrip(trip.id);
  logger.info('Series month invoiced', {
    seriesId: trip.seriesId,
    groupId,
    days: records.length,
    gross: monthGross,
  });

  return saved;
};

export const invoiceTrip = async (id: string, input: TripInvoiceWriteRequest): Promise<TripDto> => {
  const current = await getTrip(id);
  const previousGroupId = current.invoiceGroupId;

  if (input.billSeriesMonth) {
    const saved = await invoiceSeriesMonth(current, input);

    if (previousGroupId && previousGroupId !== saved.invoiceGroupId) {
      await syncSeriesInvoiceRevenue(previousGroupId);
    }

    return saved;
  }

  const fare = fareForInvoice(input);
  const record = await prisma.trip.update({
    where: { id },
    data: invoiceColumns(input, fare, null),
    include: tripInclude,
  });
  const trip = toTripDto(record);
  await syncTripRevenue(trip);

  if (previousGroupId) {
    await syncSeriesInvoiceRevenue(previousGroupId);
  }

  logger.info('Trip invoiced', { tripId: id, referenceNumber: trip.referenceNumber, gross: fare.grossAmount });

  return trip;
};

export const deleteTrip = async (id: string): Promise<DeleteTripResult> => {
  const existing = await getTrip(id);

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

  if (existing.invoiceGroupId) {
    await syncSeriesInvoiceRevenue(existing.invoiceGroupId);
  }

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
