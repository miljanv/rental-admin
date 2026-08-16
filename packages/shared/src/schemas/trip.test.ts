import { describe, expect, it } from 'vitest';

import { listTripsQuerySchema, tripWriteSchema } from './trip';

const validTrip = {
  referenceNumber: 'RN-1042',
  departureDate: '2026-09-01',
  origin: 'Novi Sad',
  destination: 'Zlatibor',
  status: 'PLANNED',
  vehicleIds: ['vehicle_1'],
  driverIds: ['driver_1'],
} as const;

describe('tripWriteSchema', () => {
  it('accepts a minimal trip and defaults optional fields to null/empty', () => {
    const result = tripWriteSchema.safeParse(validTrip);

    expect(result.success).toBe(true);
    expect(result.data?.partnerId).toBeNull();
    expect(result.data?.clientName).toBeNull();
    expect(result.data?.price).toBeNull();
  });

  it('rejects a return date before the departure date', () => {
    const result = tripWriteSchema.safeParse({
      ...validTrip,
      departureDate: '2026-09-05',
      returnDate: '2026-09-01',
    });

    expect(result.success).toBe(false);
  });

  it('accepts a return date on or after the departure date', () => {
    const result = tripWriteSchema.safeParse({
      ...validTrip,
      returnDate: '2026-09-01',
    });

    expect(result.success).toBe(true);
  });

  it('normalizes an empty price to null', () => {
    const result = tripWriteSchema.safeParse({ ...validTrip, price: '' });

    expect(result.success).toBe(true);
    expect(result.data?.price).toBeNull();
  });

  it('rejects more than 20 vehicles', () => {
    const result = tripWriteSchema.safeParse({
      ...validTrip,
      vehicleIds: Array.from({ length: 21 }, (_, index) => `vehicle_${index}`),
    });

    expect(result.success).toBe(false);
  });

  it('rejects more than 3 drivers', () => {
    const result = tripWriteSchema.safeParse({
      ...validTrip,
      driverIds: Array.from({ length: 4 }, (_, index) => `driver_${index}`),
    });

    expect(result.success).toBe(false);
  });

  it('accepts a trip without a reference number — it is assigned at invoicing time', () => {
    const { referenceNumber: _referenceNumber, ...rest } = validTrip;
    const result = tripWriteSchema.safeParse(rest);

    expect(result.success).toBe(true);
    expect(result.data?.referenceNumber).toBeNull();
  });

  it('normalizes an empty passenger count to null', () => {
    const result = tripWriteSchema.safeParse({ ...validTrip, passengerCount: '' });

    expect(result.success).toBe(true);
    expect(result.data?.passengerCount).toBeNull();
  });

  it('accepts a valid passenger count', () => {
    const result = tripWriteSchema.safeParse({ ...validTrip, passengerCount: 45 });

    expect(result.success).toBe(true);
    expect(result.data?.passengerCount).toBe(45);
  });

  it('rejects a zero or negative passenger count', () => {
    expect(tripWriteSchema.safeParse({ ...validTrip, passengerCount: 0 }).success).toBe(false);
    expect(tripWriteSchema.safeParse({ ...validTrip, passengerCount: -1 }).success).toBe(false);
  });
});

describe('listTripsQuerySchema', () => {
  it('defaults to departure date descending', () => {
    expect(listTripsQuerySchema.parse({})).toMatchObject({
      page: 1,
      limit: 10,
      sortBy: 'departureDate',
      sortOrder: 'desc',
    });
  });
});
