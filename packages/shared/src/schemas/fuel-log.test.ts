import { describe, expect, it } from 'vitest';

import { fuelLogWriteSchema, listFuelLogsQuerySchema } from './fuel-log';

const validLog = {
  fueledAt: '2026-08-14',
  location: 'NIS pumpa, Novi Sad',
  driverId: null,
  fuelType: 'DIESEL',
  litersFilled: 40,
  odometerKm: 100_500,
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
});

describe('listFuelLogsQuerySchema', () => {
  it('defaults to descending order with no filters', () => {
    expect(listFuelLogsQuerySchema.parse({})).toEqual({ sortOrder: 'desc' });
  });
});
