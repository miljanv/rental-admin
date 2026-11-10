import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    tripVehicle: { findMany: vi.fn(), update: vi.fn() },
    trip: { update: vi.fn() },
  },
}));

vi.mock('../config/prisma', () => ({ prisma: prismaMock, prismaUnscoped: prismaMock }));

import { applyTripVehicleKm } from './trip-vehicle-km.service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('applyTripVehicleKm', () => {
  it('writes each vehicle and sums the trip distance', async () => {
    prismaMock.tripVehicle.findMany.mockResolvedValue([
      { id: 'tv_1', vehicleId: 'veh_1', startKm: null, endKm: null },
      { id: 'tv_2', vehicleId: 'veh_2', startKm: null, endKm: null },
    ]);

    await applyTripVehicleKm(
      'trip_1',
      [
        { vehicleId: 'veh_1', startKm: 100, endKm: 260 },
        { vehicleId: 'veh_2', startKm: 5_000, endKm: 5_158 },
      ],
      'DRIVER',
    );

    expect(prismaMock.tripVehicle.update).toHaveBeenCalledTimes(2);
    expect(prismaMock.tripVehicle.update).toHaveBeenCalledWith({
      where: { id: 'tv_1' },
      data: expect.objectContaining({ startKm: 100, endKm: 260, kmSource: 'DRIVER' }),
    });
    // Several vehicles: only the sum goes to the trip, its own readings stay as they were.
    expect(prismaMock.trip.update).toHaveBeenCalledWith({
      where: { id: 'trip_1' },
      data: { distanceKm: 318 },
    });
  });

  it('mirrors the readings of a single vehicle onto the trip', async () => {
    prismaMock.tripVehicle.findMany.mockResolvedValue([
      { id: 'tv_1', vehicleId: 'veh_1', startKm: null, endKm: null },
    ]);

    await applyTripVehicleKm('trip_1', [{ vehicleId: 'veh_1', startKm: 100, endKm: 260 }], 'ADMIN');

    expect(prismaMock.trip.update).toHaveBeenCalledWith({
      where: { id: 'trip_1' },
      data: { distanceKm: 160, startKm: 100, endKm: 260 },
    });
  });

  it('keeps the source of a reading that did not change', async () => {
    prismaMock.tripVehicle.findMany.mockResolvedValue([
      { id: 'tv_1', vehicleId: 'veh_1', startKm: 100, endKm: 260 },
    ]);

    await applyTripVehicleKm('trip_1', [{ vehicleId: 'veh_1', startKm: 100, endKm: 260 }], 'ADMIN');

    expect(prismaMock.tripVehicle.update).not.toHaveBeenCalled();
  });

  it('rejects a vehicle that is not on the trip', async () => {
    prismaMock.tripVehicle.findMany.mockResolvedValue([
      { id: 'tv_1', vehicleId: 'veh_1', startKm: null, endKm: null },
    ]);

    await expect(
      applyTripVehicleKm('trip_1', [{ vehicleId: 'veh_9', startKm: 1, endKm: 2 }], 'DRIVER'),
    ).rejects.toThrow('Vozilo nije dodeljeno ovoj vožnji.');
    expect(prismaMock.trip.update).not.toHaveBeenCalled();
  });
});
