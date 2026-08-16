import { describe, expect, it } from 'vitest';

import {
  closestEarlierOdometer,
  computeFuelLogDerivedFields,
  mergeFuelSuppliers,
  summarizeFuelLogs,
  type FuelLogDto,
} from './fuel-log';

describe('computeFuelLogDerivedFields', () => {
  it('returns nulls when there is no previous reading', () => {
    expect(computeFuelLogDerivedFields(100_000, null, 40)).toEqual({
      kmDriven: null,
      consumptionPer100Km: null,
    });
  });

  it('computes km driven and L/100km against the previous reading', () => {
    // 500 km driven, 40 liters -> 8 L/100km
    expect(computeFuelLogDerivedFields(100_500, 100_000, 40)).toEqual({
      kmDriven: 500,
      consumptionPer100Km: 8,
    });
  });

  it('rounds consumption to 2 decimals', () => {
    // 300 km driven, 25 liters -> 8.333... L/100km
    const result = computeFuelLogDerivedFields(100_300, 100_000, 25);
    expect(result.kmDriven).toBe(300);
    expect(result.consumptionPer100Km).toBe(8.33);
  });

  it('guards against a non-advancing or reversed odometer (divide by zero)', () => {
    expect(computeFuelLogDerivedFields(100_000, 100_000, 40)).toEqual({
      kmDriven: 0,
      consumptionPer100Km: null,
    });
    expect(computeFuelLogDerivedFields(99_000, 100_000, 40)).toEqual({
      kmDriven: -1000,
      consumptionPer100Km: null,
    });
  });
});

describe('closestEarlierOdometer', () => {
  it('picks the highest reading still below the current one', () => {
    expect(closestEarlierOdometer(120_000, [100_000, 110_000, 130_000, null])).toBe(110_000);
    expect(closestEarlierOdometer(90_000, [100_000, null])).toBeNull();
  });
});

describe('mergeFuelSuppliers', () => {
  it('unions suggested names with stored ones', () => {
    expect(mergeFuelSuppliers(['  Petrol  ', 'NIS'])).toEqual(
      expect.arrayContaining(['EuroWag', 'NIS', 'OMV', 'Petrol']),
    );
  });
});

describe('summarizeFuelLogs', () => {
  const item = (overrides: Partial<FuelLogDto>): FuelLogDto => ({
    id: '1',
    vehicleId: 'v1',
    vehicle: { id: 'v1', make: 'Setra', model: 'S 516', licensePlate: 'NS-001-AA' },
    fueledAt: '2026-08-16',
    location: '',
    driver: null,
    fuelType: 'DIESEL',
    litersFilled: 40,
    odometerKm: 100_500,
    cost: null,
    paymentMethod: null,
    supplier: 'NIS',
    note: null,
    kmDriven: 500,
    consumptionPer100Km: 8,
    createdAt: '2026-08-16T00:00:00.000Z',
    updatedAt: '2026-08-16T00:00:00.000Z',
    ...overrides,
  });

  it('averages L/100km from total liters over total km', () => {
    const summary = summarizeFuelLogs([
      item({ litersFilled: 40, kmDriven: 500 }),
      item({ id: '2', litersFilled: 50, kmDriven: 400 }),
    ]);

    expect(summary.fillCount).toBe(2);
    expect(summary.litersFilled).toBe(90);
    expect(summary.kmDriven).toBe(900);
    expect(summary.avgConsumptionPer100Km).toBe(10);
  });
});
