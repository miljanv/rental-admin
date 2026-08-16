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
  initialMileageKm: 118_500,
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
    expect(vehicleWriteSchema.safeParse({ ...validVehicle, type: 'TRUCK' }).success).toBe(false);
  });

  it('accepts the car vehicle type', () => {
    expect(vehicleWriteSchema.safeParse({ ...validVehicle, type: 'CAR' }).success).toBe(true);
  });

  it('defaults the new technical spec fields to null when omitted', () => {
    const result = vehicleWriteSchema.safeParse(validVehicle);

    expect(result.success).toBe(true);
    expect(result.data?.engineNumber).toBeNull();
    expect(result.data?.enginePower).toBeNull();
    expect(result.data?.engineDisplacement).toBeNull();
    expect(result.data?.mass).toBeNull();
    expect(result.data?.standingCapacity).toBeNull();
  });

  it('accepts the new technical spec fields, including zero for an electric engine displacement', () => {
    const result = vehicleWriteSchema.safeParse({
      ...validVehicle,
      engineNumber: 'ENG-12345',
      enginePower: 130,
      engineDisplacement: 0,
      mass: 3500,
      standingCapacity: 0,
    });

    expect(result.success).toBe(true);
    expect(result.data?.engineDisplacement).toBe(0);
  });

  it('rejects a negative standing capacity', () => {
    expect(
      vehicleWriteSchema.safeParse({ ...validVehicle, standingCapacity: -1 }).success,
    ).toBe(false);
  });

  it('requires an initial mileage', () => {
    const { initialMileageKm: _initialMileageKm, ...rest } = validVehicle;
    expect(vehicleWriteSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a negative initial mileage', () => {
    expect(
      vehicleWriteSchema.safeParse({ ...validVehicle, initialMileageKm: -1 }).success,
    ).toBe(false);
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
