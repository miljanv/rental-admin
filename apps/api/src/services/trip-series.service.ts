import {
  buildTripSeriesOccurrenceDates,
  seriesInvoiceGroupId,
  type BulkUpdateTripSeriesRequest,
  type BulkUpdateTripSeriesResult,
  type EditTripSeriesRequest,
  type EditTripSeriesResult,
  type GenerateTripSeriesRequest,
  type GenerateTripSeriesResult,
  type TerminateTripSeriesRequest,
  type TerminateTripSeriesResult,
  type TripDto,
  type TripSeriesDto,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { badRequest, notFound } from '../utils/app-error';
import { logger } from '../utils/logger';
import { assertDocumentHasNoAllocations } from '../utils/settled-document';
import { toTripDto, toTripSeriesDto, type TripRecord } from '../utils/trip-mapper';
import { requireOrganizationId } from '../utils/tenant-context';
import { syncTripDriverPayouts } from './trip-expense.service';
import { assertDriversExist, assertVehiclesExist, parseDate, tripInclude } from './trip.service';
import { assertVehiclesEnabled } from './vehicle-enabled.service';

/** Safety cap on how many trips one generation call can create in a single transaction. */
const MAX_SERIES_INSTANCES = 400;

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

const seriesVehicleIds = async (seriesId: string): Promise<string[]> => {
  const rows = await prisma.tripVehicle.findMany({
    where: { trip: { seriesId } },
    select: { vehicleId: true },
    distinct: ['vehicleId'],
  });

  return rows.map((row) => row.vehicleId);
};

export const generateTripSeries = async (
  input: GenerateTripSeriesRequest,
): Promise<GenerateTripSeriesResult> => {
  await assertReferencesExist(input);
  await assertVehiclesEnabled(input.vehicleIds);

  const dates = buildTripSeriesOccurrenceDates(input);

  if (dates.length === 0) {
    throw badRequest('Izabrani period i dani u nedelji ne generišu nijednu vožnju.');
  }

  if (dates.length > MAX_SERIES_INSTANCES) {
    throw badRequest(
      `Serija bi generisala ${dates.length} vožnji — maksimum je ${MAX_SERIES_INSTANCES}.`,
    );
  }

  const organizationId = requireOrganizationId();

  const result = await prisma.$transaction(
    async (tx) => {
      const series = await tx.tripSeries.create({
        data: {
          organizationId,
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
          organizationId,
          referenceNumber: input.referenceNumber,
          departureDate: parseDate(date),
          returnDate: parseDate(date),
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
    await assertVehiclesEnabled(input.vehicleIds, await seriesVehicleIds(seriesId));
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

const DAY_MS = 86_400_000;

const shiftDate = (value: Date, days: number): Date => new Date(value.getTime() + days * DAY_MS);

const isoDate = (value: Date): string => value.toISOString().slice(0, 10);

export interface ShiftableSeriesTrip {
  id: string;
  departureDate: Date;
  returnDate: Date | null;
  invoiceSupplyDate: Date | null;
  invoiceGroupId: string | null;
  paidAt: Date | null;
  travelTimeline: unknown;
  perDiemDocumentNumber: string | null;
}

export interface SeriesTripShift {
  id: string;
  departureDate: Date;
  returnDate: Date | null;
  invoiceSupplyDate: Date | null;
  invoiceGroupId: string | null;
}

/**
 * New dates for every day of a series moved by `days`. A monthly invoice moves with its days, so it
 * must land in exactly one month and must not merge into another monthly invoice.
 */
export const planSeriesShift = (
  seriesId: string,
  frequency: string,
  trips: ShiftableSeriesTrip[],
  days: number,
): SeriesTripShift[] => {
  if (frequency === 'WEEKLY' && days % 7 !== 0) {
    throw badRequest(
      'Nedeljna serija se pomera samo za cele nedelje, da dani u nedelji ostanu isti.',
    );
  }

  if (trips.some((trip) => trip.paidAt)) {
    throw badRequest('Serija ima plaćene dane i ne može se pomeriti.');
  }

  if (
    trips.some(
      (trip) =>
        (trip.travelTimeline !== null && trip.travelTimeline !== undefined) ||
        trip.perDiemDocumentNumber,
    )
  ) {
    throw badRequest('Serija ima obračun dnevnica vozača i ne može se pomeriti.');
  }

  const seriesGroupPrefix = `series:${seriesId}:`;
  const movedGroups = new Map<string, Set<string>>();

  const shifts = trips.map((trip) => {
    const departureDate = shiftDate(trip.departureDate, days);
    let invoiceGroupId = trip.invoiceGroupId;

    if (invoiceGroupId?.startsWith(seriesGroupPrefix)) {
      const nextGroupId = seriesInvoiceGroupId(seriesId, isoDate(departureDate));
      movedGroups.set(
        invoiceGroupId,
        (movedGroups.get(invoiceGroupId) ?? new Set()).add(nextGroupId),
      );
      invoiceGroupId = nextGroupId;
    }

    return {
      id: trip.id,
      departureDate,
      returnDate: trip.returnDate ? shiftDate(trip.returnDate, days) : null,
      invoiceSupplyDate: trip.invoiceSupplyDate ? shiftDate(trip.invoiceSupplyDate, days) : null,
      invoiceGroupId,
    };
  });

  const targetGroups = new Set<string>();

  for (const next of movedGroups.values()) {
    const [target] = [...next];

    if (next.size > 1 || !target) {
      throw badRequest('Mesečna faktura serije bi se posle pomeranja podelila na dva meseca.');
    }

    if (targetGroups.has(target)) {
      throw badRequest('Posle pomeranja bi se dve mesečne fakture serije spojile u isti mesec.');
    }

    targetGroups.add(target);
  }

  return shifts;
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
  await assertVehiclesEnabled(input.vehicleIds, await seriesVehicleIds(seriesId));
  await assertDriversExist(input.driverIds);

  const trips = await prisma.trip.findMany({
    where: { seriesId },
    select: {
      id: true,
      departureDate: true,
      returnDate: true,
      invoicedAt: true,
      invoiceSupplyDate: true,
      paidAt: true,
      invoiceGroupId: true,
      travelTimeline: true,
      perDiemDocumentNumber: true,
      vehicles: { select: { vehicleId: true } },
      drivers: { select: { driverId: true } },
    },
  });

  if (trips.length === 0) {
    throw badRequest('Serija nema vožnji za izmenu.');
  }

  const shiftedDays = input.startDate
    ? Math.round((parseDate(input.startDate).getTime() - series.startDate.getTime()) / DAY_MS)
    : 0;
  const shifts =
    shiftedDays === 0 ? [] : planSeriesShift(seriesId, series.frequency, trips, shiftedDays);

  if (shifts.length > 0) {
    await assertDocumentHasNoAllocations(
      trips.flatMap((trip) => [
        { targetType: 'TRIP_INVOICE' as const, targetId: trip.id },
        ...(trip.invoiceGroupId
          ? [{ targetType: 'TRIP_SERIES_INVOICE' as const, targetId: trip.invoiceGroupId }]
          : []),
      ]),
    );
  }

  const priceKeptIds = trips
    .filter((trip) => trip.invoicedAt || trip.paidAt || trip.invoiceGroupId)
    .map((trip) => trip.id);
  const priceUpdateIds = trips
    .filter((trip) => !priceKeptIds.includes(trip.id))
    .map((trip) => trip.id);
  let driversChanged = false;

  await prisma.$transaction(
    async (tx) => {
      await tx.tripSeries.update({
        where: { id: seriesId },
        data: {
          name: input.name,
          ...(shifts.length > 0
            ? {
                startDate: shiftDate(series.startDate, shiftedDays),
                endDate: shiftDate(series.endDate, shiftedDays),
                terminatedAt: series.terminatedAt
                  ? shiftDate(series.terminatedAt, shiftedDays)
                  : null,
              }
            : {}),
        },
      });

      if (shifts.length > 0) {
        for (const { id, ...dates } of shifts) {
          await tx.trip.update({ where: { id }, data: dates });
        }

        const pauses = await tx.tripSeriesPause.findMany({ where: { seriesId } });

        for (const pause of pauses) {
          await tx.tripSeriesPause.update({
            where: { id: pause.id },
            data: {
              startDate: shiftDate(pause.startDate, shiftedDays),
              endDate: shiftDate(pause.endDate, shiftedDays),
            },
          });
        }
      }

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
        .filter(
          (trip) =>
            !sameIds(
              trip.vehicles.map((row) => row.vehicleId),
              input.vehicleIds,
            ),
        )
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

      if (input.driverPay !== null && input.driverPay !== undefined) {
        await tx.tripDriver.updateMany({
          where: { tripId: { in: trips.map((trip) => trip.id) } },
          data: { perDiemAmount: input.driverPay },
        });
      }

      driversChanged = driverRemovals.length > 0 || driverAdditions.length > 0;
    },
    { timeout: 30_000 },
  );

  if ((input.driverPay !== null && input.driverPay !== undefined) || driversChanged) {
    for (const trip of trips) {
      await syncTripDriverPayouts(trip.id);
    }
  }

  logger.info('Trip series edited', {
    seriesId,
    count: trips.length,
    priceKept: priceKeptIds.length,
    shiftedDays,
  });

  return { updatedCount: trips.length, priceKeptCount: priceKeptIds.length, shiftedDays };
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
