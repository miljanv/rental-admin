import { describe, expect, it } from 'vitest';

import {
  buildVehicleTripsSummary,
  tripRevenue,
  tripVehicleKm,
  tripVehicleShare,
  type VehicleTripInput,
} from './vehicle-trips.service';

const vehicleKm = (
  vehicleId: string,
  km: Partial<Omit<VehicleTripInput['vehicles'][number], 'vehicleId'>> = {},
): VehicleTripInput['vehicles'][number] => ({
  vehicleId,
  startKm: null,
  endKm: null,
  garageStartKm: null,
  garageEndKm: null,
  ...km,
});

const trip = (overrides: Partial<VehicleTripInput> = {}): VehicleTripInput => ({
  id: 'trip-1',
  referenceNumber: null,
  departureDate: '2026-03-10',
  returnDate: null,
  route: 'Beograd – Novi Sad',
  client: 'Klijent',
  status: 'COMPLETED',
  drivers: ['Pera Perić'],
  distanceKm: null,
  startKm: null,
  endKm: null,
  price: null,
  invoiceGrossAmount: null,
  cashAmount: null,
  vehicles: [vehicleKm('bus-a')],
  expenseTotal: 0,
  ...overrides,
});

describe('tripVehicleKm', () => {
  it('prefers garage-to-garage km over the job odometer', () => {
    const vehicle = vehicleKm('bus-a', {
      startKm: 1000,
      endKm: 1200,
      garageStartKm: 980,
      garageEndKm: 1230,
    });

    expect(tripVehicleKm(trip({ vehicles: [vehicle] }), vehicle)).toBe(250);
  });

  it('falls back to the trip distance only for a single-vehicle trip', () => {
    const single = trip({ distanceKm: 300 });
    const shared = trip({ distanceKm: 300, vehicles: [vehicleKm('bus-a'), vehicleKm('bus-b')] });

    expect(tripVehicleKm(single, single.vehicles[0]!)).toBe(300);
    expect(tripVehicleKm(shared, shared.vehicles[0]!)).toBeNull();
  });
});

describe('tripVehicleShare', () => {
  it('splits by km when every vehicle has km', () => {
    const shared = trip({
      vehicles: [
        vehicleKm('bus-a', { startKm: 0, endKm: 300 }),
        vehicleKm('bus-b', { startKm: 0, endKm: 100 }),
      ],
    });

    expect(tripVehicleShare(shared, 'bus-a')).toBe(0.75);
    expect(tripVehicleShare(shared, 'bus-b')).toBe(0.25);
  });

  it('splits equally when any vehicle is missing km', () => {
    const shared = trip({
      vehicles: [vehicleKm('bus-a', { startKm: 0, endKm: 300 }), vehicleKm('bus-b')],
    });

    expect(tripVehicleShare(shared, 'bus-a')).toBe(0.5);
  });
});

describe('tripRevenue', () => {
  it('uses the invoice, then cash, then the agreed price', () => {
    expect(tripRevenue(trip({ invoiceGrossAmount: 100, cashAmount: 50, price: 10 }))).toEqual({
      amount: 100,
      source: 'INVOICE',
    });
    expect(tripRevenue(trip({ cashAmount: 50, price: 10 }))).toEqual({
      amount: 50,
      source: 'CASH',
    });
    expect(tripRevenue(trip({ price: 10 }))).toEqual({ amount: 10, source: 'PRICE' });
  });

  it('gives free trips no revenue', () => {
    expect(tripRevenue(trip({ status: 'FREE', price: 10 }))).toEqual({
      amount: 0,
      source: 'NONE',
    });
  });
});

describe('buildVehicleTripsSummary', () => {
  it('allocates trip revenue and expenses and adds fuel and maintenance per month', () => {
    const summary = buildVehicleTripsSummary({
      vehicleId: 'bus-a',
      from: '2026-03-01',
      to: '2026-04-30',
      trips: [
        trip({
          invoiceGrossAmount: 40000,
          expenseTotal: 4000,
          vehicles: [
            vehicleKm('bus-a', { startKm: 0, endKm: 300 }),
            vehicleKm('bus-b', { startKm: 0, endKm: 100 }),
          ],
        }),
        trip({ id: 'trip-2', departureDate: '2026-04-02', price: 10000, distanceKm: 200 }),
      ],
      fuel: [{ date: '2026-03-12', amount: 9000, liters: 50 }],
      maintenance: [{ date: '2026-04-20', amount: 5000 }],
    });

    expect(summary.months.map((month) => month.month)).toEqual(['2026-03', '2026-04']);
    expect(summary.months[0]).toMatchObject({
      tripCount: 1,
      km: 300,
      revenue: 30000,
      tripExpenses: 3000,
      fuelExpense: 9000,
      result: 18000,
    });
    expect(summary.months[1]).toMatchObject({
      revenue: 10000,
      estimatedRevenue: 10000,
      maintenanceExpense: 5000,
      result: 5000,
    });
    expect(summary.totals).toMatchObject({
      tripCount: 2,
      km: 500,
      revenue: 40000,
      estimatedRevenue: 10000,
      totalExpense: 17000,
      result: 23000,
      fuelLiters: 50,
      revenuePerKm: 80,
      costPerKm: 34,
    });
    expect(summary.trips.map((row) => row.tripId)).toEqual(['trip-2', 'trip-1']);
    expect(summary.trips[1]).toMatchObject({ share: 0.75, revenue: 30000, result: 27000 });
  });
});
