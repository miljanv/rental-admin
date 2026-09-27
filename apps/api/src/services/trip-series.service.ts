import type {
  BulkUpdateTripSeriesRequest,
  BulkUpdateTripSeriesResult,
  EditTripSeriesRequest,
  EditTripSeriesResult,
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
import { syncTripDriverPayouts } from './trip-expense.service';
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

const sameIds = (current: string[], next: string[]): boolean => {
  if (current.length !== next.length) {
    return false;
  }

  const left = [...current].sort();
  const right = [...next].sort();

  return left.every((id, index) => id === right[index]);
};

/** Writes the shared route, client, vehicles and drivers onto every day. Invoiced days keep their price. */
export const editTripSeries = async (
  seriesId: string,
  input: EditTripSeriesRequest,
): Promise<EditTripSeriesResult> => {
  const series = await prisma.tripSeries.findUnique({ where: { id: seriesId } });

  if (!series) {
    throw notFound('Serija nije pronađena.');
  }

  if (input.partnerId) {
    const partner = await prisma.partner.findUnique({
      where: { id: input.partnerId },
      select: { id: true },
    });

    if (!partner) {
      throw badRequest('Izabrani partner ne postoji.');
    }
  }

  await assertVehiclesExist(input.vehicleIds);
  await assertDriversExist(input.driverIds);

  const trips = await prisma.trip.findMany({
    where: { seriesId },
    select: {
      id: true,
      invoicedAt: true,
      paidAt: true,
      invoiceGroupId: true,
      vehicles: { select: { vehicleId: true } },
      drivers: { select: { driverId: true } },
    },
  });

  if (trips.length === 0) {
    throw badRequest('Serija nema vožnji za izmenu.');
  }

  const priceKeptIds = trips
    .filter((trip) => trip.invoicedAt || trip.paidAt || trip.invoiceGroupId)
    .map((trip) => trip.id);
  const priceUpdateIds = trips
    .filter((trip) => !priceKeptIds.includes(trip.id))
    .map((trip) => trip.id);
  let driversChanged = false;

  await prisma.$transaction(async (tx) => {
    await tx.tripSeries.update({
      where: { id: seriesId },
      data: { name: input.name },
    });

    await tx.trip.updateMany({
      where: { seriesId },
      data: {
        origin: input.origin,
        destination: input.destination,
        country: input.country,
        passengerCount: input.passengerCount,
        partnerId: input.partnerId,
        clientName: input.clientName,
        notes: input.notes,
        vehicleCount: input.vehicleCount,
      },
    });

    if (priceUpdateIds.length > 0) {
      await tx.trip.updateMany({
        where: { id: { in: priceUpdateIds } },
        data: {
          price: input.price,
          paymentMethod: input.paymentMethod,
        },
      });
    }

    const vehicleTripIds = trips
      .filter((trip) => !sameIds(trip.vehicles.map((row) => row.vehicleId), input.vehicleIds))
      .map((trip) => trip.id);

    if (vehicleTripIds.length > 0) {
      await tx.tripVehicle.deleteMany({ where: { tripId: { in: vehicleTripIds } } });
      const vehicleRows = vehicleTripIds.flatMap((tripId) =>
        input.vehicleIds.map((vehicleId) => ({ tripId, vehicleId })),
      );
      if (vehicleRows.length > 0) {
        await tx.tripVehicle.createMany({ data: vehicleRows });
      }
    }

    const driverRemovals = trips.flatMap((trip) => {
      const remove = trip.drivers
        .map((row) => row.driverId)
        .filter((driverId) => !input.driverIds.includes(driverId));

      return remove.length > 0 ? [{ tripId: trip.id, driverId: { in: remove } }] : [];
    });

    if (driverRemovals.length > 0) {
      await tx.tripDriver.deleteMany({ where: { OR: driverRemovals } });
    }

    const driverAdditions = trips.flatMap((trip) => {
      const current = new Set(trip.drivers.map((row) => row.driverId));

      return input.driverIds
        .filter((driverId) => !current.has(driverId))
        .map((driverId) => ({ tripId: trip.id, driverId }));
    });

    if (driverAdditions.length > 0) {
      await tx.tripDriver.createMany({ data: driverAdditions });
    }

    if (input.driverPay != null) {
      await tx.tripDriver.updateMany({
        where: { tripId: { in: trips.map((trip) => trip.id) } },
        data: { perDiemAmount: input.driverPay },
      });
    }

    driversChanged = driverRemovals.length > 0 || driverAdditions.length > 0;
  });

  if (input.driverPay != null || driversChanged) {
    for (const trip of trips) {
      await syncTripDriverPayouts(trip.id);
    }
  }

  logger.info('Trip series edited', {
    seriesId,
    count: trips.length,
    priceKept: priceKeptIds.length,
  });

  return { updatedCount: trips.length, priceKeptCount: priceKeptIds.length };
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
