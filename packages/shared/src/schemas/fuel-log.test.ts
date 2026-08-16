import { describe, expect, it } from 'vitest';

import { fuelLogBulkWriteSchema, fuelLogCreateSchema, fuelLogWriteSchema, listFuelLogsQuerySchema } from './fuel-log';

const validLog = {
  fueledAt: '2026-08-14',
  location: 'NIS pumpa, Novi Sad',
  driverId: null,
  fuelType: 'DIESEL',
  litersFilled: 40,
  odometerKm: 100_500,
  supplier: 'NIS',
} as const;

describe('fuelLogWriteSchema', () => {
  it('accepts a complete fuel log payload', () => {
    expect(fuelLogWriteSchema.safeParse(validLog).success).toBe(true);
  });

  it('rejects zero or negative liters', () => {
    expect(fuelLogWriteSchema.safeParse({ ...validLog, litersFilled: 0 }).success).toBe(false);
    expect(fuelLogWriteSchema.safeParse({ ...validLog, litersFilled: -5 }).success).toBe(false);
  });

  it('rejects a negative odometer reading', () => {
    expect(fuelLogWriteSchema.safeParse({ ...validLog, odometerKm: -1 }).success).toBe(false);
  });

  it('requires a supplier', () => {
    expect(fuelLogWriteSchema.safeParse({ ...validLog, supplier: '' }).success).toBe(false);
  });

  it('allows an empty location and optional note', () => {
    const result = fuelLogWriteSchema.safeParse({
      ...validLog,
      location: '',
      note: 'Grupni račun EW',
    });

    expect(result.success).toBe(true);
    expect(result.data?.location).toBe('');
    expect(result.data?.note).toBe('Grupni račun EW');
  });
});

describe('fuelLogCreateSchema', () => {
  it('requires a vehicleId', () => {
    expect(fuelLogCreateSchema.safeParse(validLog).success).toBe(false);
    expect(fuelLogCreateSchema.safeParse({ ...validLog, vehicleId: 'veh_1' }).success).toBe(true);
  });
});

describe('fuelLogBulkWriteSchema', () => {
  it('accepts a grouped invoice with shared date and supplier', () => {
    const result = fuelLogBulkWriteSchema.safeParse({
      fueledAt: '2026-08-16',
      supplier: 'EuroWag',
      rows: [
        { vehicleId: 'veh_1', litersFilled: 40, odometerKm: 100_500 },
        { vehicleId: 'veh_2', litersFilled: 55, odometerKm: 210_000, fuelType: 'ADBLUE' },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.data?.fuelType).toBe('DIESEL');
    expect(result.data?.rows).toHaveLength(2);
  });

  it('rejects an empty row list', () => {
    expect(
      fuelLogBulkWriteSchema.safeParse({ fueledAt: '2026-08-16', supplier: 'OMV', rows: [] }).success,
    ).toBe(false);
  });
});

describe('listFuelLogsQuerySchema', () => {
  it('defaults to descending order with no filters', () => {
    expect(listFuelLogsQuerySchema.parse({})).toEqual({ sortOrder: 'desc' });
  });

  it('accepts vehicle, supplier and driver filters', () => {
    expect(
      listFuelLogsQuerySchema.parse({
        vehicleId: 'veh_1',
        supplier: 'OMV',
        driverId: 'driver-1',
      }),
    ).toEqual({
      vehicleId: 'veh_1',
      supplier: 'OMV',
      driverId: 'driver-1',
      sortOrder: 'desc',
    });
  });
});
