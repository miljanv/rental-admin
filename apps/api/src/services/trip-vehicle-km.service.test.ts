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
      {
        id: 'tv_1',
        vehicleId: 'veh_1',
        garageStartKm: null,
        startKm: null,
        endKm: null,
        garageEndKm: null,
      },
      {
        id: 'tv_2',
        vehicleId: 'veh_2',
        garageStartKm: null,
        startKm: null,
        endKm: null,
        garageEndKm: null,
      },
    ]);

    await applyTripVehicleKm(
      'trip_1',
      [
        { vehicleId: 'veh_1', garageStartKm: null, startKm: 100, endKm: 260, garageEndKm: null },
        {
          vehicleId: 'veh_2',
          garageStartKm: null,
          startKm: 5_000,
          endKm: 5_158,
          garageEndKm: null,
        },
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
      {
        id: 'tv_1',
        vehicleId: 'veh_1',
        garageStartKm: null,
        startKm: null,
        endKm: null,
        garageEndKm: null,
      },
    ]);

    await applyTripVehicleKm(
      'trip_1',
      [{ vehicleId: 'veh_1', garageStartKm: null, startKm: 100, endKm: 260, garageEndKm: null }],
      'ADMIN',
    );

    expect(prismaMock.trip.update).toHaveBeenCalledWith({
      where: { id: 'trip_1' },
      data: { distanceKm: 160, startKm: 100, endKm: 260 },
    });
  });

  it('keeps the source of a reading that did not change', async () => {
    prismaMock.tripVehicle.findMany.mockResolvedValue([
      {
        id: 'tv_1',
        vehicleId: 'veh_1',
        garageStartKm: null,
        startKm: 100,
        endKm: 260,
        garageEndKm: null,
      },
    ]);

    await applyTripVehicleKm(
      'trip_1',
      [{ vehicleId: 'veh_1', garageStartKm: null, startKm: 100, endKm: 260, garageEndKm: null }],
      'ADMIN',
    );

    expect(prismaMock.tripVehicle.update).not.toHaveBeenCalled();
  });

  it('rejects a vehicle that is not on the trip', async () => {
    prismaMock.tripVehicle.findMany.mockResolvedValue([
      {
        id: 'tv_1',
        vehicleId: 'veh_1',
        garageStartKm: null,
        startKm: null,
        endKm: null,
        garageEndKm: null,
      },
    ]);

    await expect(
      applyTripVehicleKm(
        'trip_1',
        [{ vehicleId: 'veh_9', garageStartKm: null, startKm: 1, endKm: 2, garageEndKm: null }],
        'DRIVER',
      ),
    ).rejects.toThrow('Vozilo nije dodeljeno ovoj vožnji.');
    expect(prismaMock.trip.update).not.toHaveBeenCalled();
  });

  it('writes the garage readings and keeps the trip distance on the passenger leg', async () => {
    prismaMock.tripVehicle.findMany.mockResolvedValue([
      {
        id: 'tv_1',
        vehicleId: 'veh_1',
        garageStartKm: null,
        startKm: null,
        endKm: null,
        garageEndKm: null,
      },
    ]);

    await applyTripVehicleKm(
      'trip_1',
      [{ vehicleId: 'veh_1', garageStartKm: 90, startKm: 100, endKm: 260, garageEndKm: 275 }],
      'DRIVER',
    );

    expect(prismaMock.tripVehicle.update).toHaveBeenCalledWith({
      where: { id: 'tv_1' },
      data: expect.objectContaining({ garageStartKm: 90, garageEndKm: 275 }),
    });
    expect(prismaMock.trip.update).toHaveBeenCalledWith({
      where: { id: 'trip_1' },
      data: { distanceKm: 160, startKm: 100, endKm: 260 },
    });
  });
});
