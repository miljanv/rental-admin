import type {
  BulkUpdateTripSeriesRequest,
  BulkUpdateTripSeriesResult,
  GenerateTripSeriesRequest,
  GenerateTripSeriesResult,
  TerminateTripSeriesRequest,
  TerminateTripSeriesResult,
  TripDto,
  TripSeriesDto,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { badRequest, notFound } from '../utils/app-error';
import { logger } from '../utils/logger';
import { toTripDto, toTripSeriesDto, type TripRecord } from '../utils/trip-mapper';
import { assertDriversExist, assertVehiclesExist, parseDate, tripInclude } from './trip.service';

/** Safety cap on how many trips one generation call can create in a single transaction. */
const MAX_SERIES_INSTANCES = 400;

const isPaused = (date: Date, pauses: Array<{ startDate: string; endDate: string }>): boolean =>
  pauses.some((pause) => {
    const from = new Date(`${pause.startDate}T00:00:00.000Z`);
    const to = new Date(`${pause.endDate}T00:00:00.000Z`);
    return date.getTime() >= from.getTime() && date.getTime() <= to.getTime();
  });

const computeSeriesDates = (
  frequency: GenerateTripSeriesRequest['frequency'],
  daysOfWeek: number[],
  startDate: string,
  endDate: string,
  pauses: GenerateTripSeriesRequest['pauses'],
): Date[] => {
  const dates: Date[] = [];
  const cursor = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const daySet = new Set(daysOfWeek);

  while (cursor.getTime() <= end.getTime()) {
    if ((frequency === 'DAILY' || daySet.has(cursor.getUTCDay())) && !isPaused(cursor, pauses)) {
      dates.push(new Date(cursor));
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
};

const assertReferencesExist = async (
  input: Pick<GenerateTripSeriesRequest, 'partnerId' | 'contractId' | 'vehicleIds' | 'driverIds'>,
): Promise<void> => {
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

export const generateTripSeries = async (
  input: GenerateTripSeriesRequest,
): Promise<GenerateTripSeriesResult> => {
  await assertReferencesExist(input);

  const dates = computeSeriesDates(
    input.frequency,
    input.daysOfWeek,
    input.startDate,
    input.endDate,
    input.pauses,
  );

  if (dates.length === 0) {
    throw badRequest('Izabrani period i dani u nedelji ne generišu nijednu vožnju.');
  }

  if (dates.length > MAX_SERIES_INSTANCES) {
    throw badRequest(
      `Serija bi generisala ${dates.length} vožnji — maksimum je ${MAX_SERIES_INSTANCES}.`,
    );
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const series = await tx.tripSeries.create({
        data: {
          name: input.name,
          frequency: input.frequency,
          daysOfWeek: input.daysOfWeek,
          startDate: parseDate(input.startDate),
          endDate: parseDate(input.endDate),
          pauses: {
            create: input.pauses.map((pause) => ({
              startDate: parseDate(pause.startDate),
              endDate: parseDate(pause.endDate),
              reason: pause.reason,
            })),
          },
        },
        include: { pauses: true },
      });

      const createdTrips = await tx.trip.createManyAndReturn({
        data: dates.map((date) => ({
          referenceNumber: input.referenceNumber,
          departureDate: date,
          returnDate: date,
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
          seriesId: series.id,
          vehicleCount: Math.max(input.vehicleCount, input.vehicleIds.length, 1),
        })),
      });

      if (input.vehicleIds.length > 0) {
        await tx.tripVehicle.createMany({
          data: createdTrips.flatMap((trip) =>
            input.vehicleIds.map((vehicleId) => ({ tripId: trip.id, vehicleId })),
          ),
        });
      }

      if (input.driverIds.length > 0) {
        await tx.tripDriver.createMany({
          data: createdTrips.flatMap((trip) =>
            input.driverIds.map((driverId) => ({ tripId: trip.id, driverId })),
          ),
        });
      }

      const trips = await tx.trip.findMany({
        where: { id: { in: createdTrips.map((trip) => trip.id) } },
        include: tripInclude,
        orderBy: { departureDate: 'asc' },
      });

      return { series, trips };
    },
    { timeout: 30_000 },
  );

  logger.info('Trip series generated', { seriesId: result.series.id, count: result.trips.length });

  return {
    series: toTripSeriesDto(result.series),
    trips: result.trips.map((record: TripRecord) => toTripDto(record)),
    generatedCount: result.trips.length,
  };
};

export const getTripSeries = async (
  id: string,
): Promise<{ series: TripSeriesDto; trips: TripDto[] }> => {
  const series = await prisma.tripSeries.findUnique({ where: { id }, include: { pauses: true } });

  if (!series) {
    throw notFound('Serija nije pronađena.');
  }

  const trips = await prisma.trip.findMany({
    where: { seriesId: id },
    include: tripInclude,
    orderBy: { departureDate: 'asc' },
  });

  return {
    series: toTripSeriesDto(series),
    trips: trips.map((record: TripRecord) => toTripDto(record)),
  };
};

export const bulkUpdateTripSeries = async (
  seriesId: string,
  input: BulkUpdateTripSeriesRequest,
): Promise<BulkUpdateTripSeriesResult> => {
  const series = await prisma.tripSeries.findUnique({ where: { id: seriesId } });

  if (!series) {
    throw notFound('Serija nije pronađena.');
  }

  if (input.vehicleIds !== undefined) {
    await assertVehiclesExist(input.vehicleIds);
  }

  if (input.driverIds !== undefined) {
    await assertDriversExist(input.driverIds);
  }

  const fromDate = parseDate(input.fromDate);
  const targetTrips = await prisma.trip.findMany({
    where: { seriesId, departureDate: { gte: fromDate } },
    select: { id: true },
  });
  const tripIds = targetTrips.map((trip) => trip.id);

  if (tripIds.length === 0) {
    throw badRequest('Nema budućih vožnji u seriji od izabranog datuma.');
  }

  await prisma.$transaction(async (tx) => {
    const scalarUpdate: Record<string, unknown> = {};
    if (input.status !== undefined) {
      scalarUpdate.status = input.status;
    }
    if (input.price !== undefined) {
      scalarUpdate.price = input.price;
    }
    if (input.paymentMethod !== undefined) {
      scalarUpdate.paymentMethod = input.paymentMethod;
    }
    if (input.vehicleCount !== undefined) {
      scalarUpdate.vehicleCount = Math.max(input.vehicleCount, input.vehicleIds?.length ?? 0, 1);
    }

    if (Object.keys(scalarUpdate).length > 0) {
      await tx.trip.updateMany({ where: { id: { in: tripIds } }, data: scalarUpdate });
    }

    if (input.vehicleIds !== undefined) {
      await tx.tripVehicle.deleteMany({ where: { tripId: { in: tripIds } } });
      const rows = tripIds.flatMap((tripId) =>
        (input.vehicleIds ?? []).map((vehicleId) => ({ tripId, vehicleId })),
      );
      if (rows.length > 0) {
        await tx.tripVehicle.createMany({ data: rows });
      }
    }

    if (input.driverIds !== undefined) {
      await tx.tripDriver.deleteMany({ where: { tripId: { in: tripIds } } });
      const rows = tripIds.flatMap((tripId) =>
        (input.driverIds ?? []).map((driverId) => ({ tripId, driverId })),
      );
      if (rows.length > 0) {
        await tx.tripDriver.createMany({ data: rows });
      }
    }
  });

  logger.info('Trip series bulk-updated', {
    seriesId,
    fromDate: input.fromDate,
    count: tripIds.length,
  });

  return { updatedCount: tripIds.length };
};

export const terminateTripSeries = async (
  seriesId: string,
  input: TerminateTripSeriesRequest,
): Promise<TerminateTripSeriesResult> => {
  const series = await prisma.tripSeries.findUnique({ where: { id: seriesId } });

  if (!series) {
    throw notFound('Serija nije pronađena.');
  }

  const fromDate = parseDate(input.fromDate);

  const result = await prisma.$transaction(async (tx) => {
    const deleteResult = await tx.trip.deleteMany({
      where: { seriesId, departureDate: { gte: fromDate } },
    });

    const updated = await tx.tripSeries.update({
      where: { id: seriesId },
      data: { isActive: false, terminatedAt: fromDate },
      include: { pauses: true },
    });

    return { series: updated, deletedCount: deleteResult.count };
  });

  logger.info('Trip series terminated', {
    seriesId,
    fromDate: input.fromDate,
    deletedCount: result.deletedCount,
  });

  return { series: toTripSeriesDto(result.series), deletedCount: result.deletedCount };
};
