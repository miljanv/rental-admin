import {
  sumTripVehicleDistanceKm,
  type TripKmSource,
  type TripVehicleKmRequest,
} from '@rental-admin/shared';

import { prisma, type TransactionClient } from '../config/prisma';
import { badRequest } from '../utils/app-error';

const sameReading = (left: number | null, right: number | null): boolean =>
  (left ?? null) === (right ?? null);

/**
 * Writes odometer readings per vehicle of a trip and keeps the trip-level
 * figures in step: `distanceKm` becomes the sum over the vehicles, and a
 * single-vehicle trip mirrors its readings into `startKm` / `endKm` so older
 * screens and reports keep working.
 *
 * Only vehicles already on the trip can be written; a reading that did not
 * change keeps its original source and timestamp.
 */
export const applyTripVehicleKm = async (
  tripId: string,
  readings: ReadonlyArray<TripVehicleKmRequest>,
  source: TripKmSource,
  tx: TransactionClient = prisma,
): Promise<void> => {
  const assignments = await tx.tripVehicle.findMany({
    where: { tripId },
    select: { id: true, vehicleId: true, startKm: true, endKm: true },
  });
  const byVehicle = new Map(assignments.map((assignment) => [assignment.vehicleId, assignment]));
  const now = new Date();

  for (const reading of readings) {
    const assignment = byVehicle.get(reading.vehicleId);

    if (!assignment) {
      throw badRequest('Vozilo nije dodeljeno ovoj vožnji.');
    }

    if (
      sameReading(assignment.startKm, reading.startKm) &&
      sameReading(assignment.endKm, reading.endKm)
    ) {
      continue;
    }

    await tx.tripVehicle.update({
      where: { id: assignment.id },
      data: {
        startKm: reading.startKm,
        endKm: reading.endKm,
        kmSource: source,
        kmUpdatedAt: now,
      },
    });

    byVehicle.set(reading.vehicleId, {
      ...assignment,
      startKm: reading.startKm,
      endKm: reading.endKm,
    });
  }

  const vehicles = [...byVehicle.values()];
  const distanceKm = sumTripVehicleDistanceKm(vehicles);
  const single = vehicles.length === 1 ? vehicles[0] : undefined;

  await tx.trip.update({
    where: { id: tripId },
    data: {
      ...(distanceKm !== null ? { distanceKm } : {}),
      ...(single ? { startKm: single.startKm, endKm: single.endKm } : {}),
    },
  });
};
