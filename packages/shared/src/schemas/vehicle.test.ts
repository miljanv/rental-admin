import { describe, expect, it } from 'vitest';

import { listVehiclesQuerySchema, vehicleWriteSchema } from './vehicle';

const validVehicle = {
  make: 'Mercedes-Benz',
  model: 'Sprinter',
  year: 2019,
  licensePlate: 'NS-123-AB',
  vin: 'WDB9066331R123456',
  seatCount: 19,
  type: 'VAN',
  fuelType: 'DIESEL',
  tachographType: 'DIGITAL',
  status: 'ACTIVE',
  currentMileage: 120_000,
} as const;

describe('vehicleWriteSchema', () => {
  it('accepts a complete vehicle payload and uppercases the VIN', () => {
    const result = vehicleWriteSchema.safeParse({ ...validVehicle, vin: 'wdb9066331r123456' });

    expect(result.success).toBe(true);
    expect(result.data?.vin).toBe('WDB9066331R123456');
    expect(result.data?.make).toBe('Mercedes-Benz');
  });

  it('rejects a year outside the allowed range', () => {
    expect(vehicleWriteSchema.safeParse({ ...validVehicle, year: 1900 }).success).toBe(false);
    expect(vehicleWriteSchema.safeParse({ ...validVehicle, year: 3000 }).success).toBe(false);
  });

  it('rejects a negative mileage', () => {
    expect(vehicleWriteSchema.safeParse({ ...validVehicle, currentMileage: -1 }).success).toBe(
      false,
    );
  });

  it('rejects an invalid vehicle type', () => {
    expect(vehicleWriteSchema.safeParse({ ...validVehicle, type: 'CAR' }).success).toBe(false);
  });
});

describe('listVehiclesQuerySchema', () => {
  it('defaults to make ascending', () => {
    expect(listVehiclesQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 10,
      sortBy: 'make',
      sortOrder: 'asc',
      search: undefined,
      status: undefined,
      type: undefined,
    });
  });
});
