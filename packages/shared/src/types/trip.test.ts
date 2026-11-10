import { describe, expect, it } from 'vitest';

import {
  groupTripsByDepartureDate,
  sumTripVehicleDistanceKm,
  tripVehicleCountLabel,
  tripVehicleDisplay,
  tripVehicleDistanceKm,
} from './trip';

const noKm = { startKm: null, endKm: null, distanceKm: null, kmSource: null, kmUpdatedAt: null };

describe('groupTripsByDepartureDate', () => {
  it('keeps consecutive same-day trips together in list order', () => {
    const groups = groupTripsByDepartureDate([
      { departureDate: '2026-08-19', id: 'a' },
      { departureDate: '2026-08-19', id: 'b' },
      { departureDate: '2026-08-20', id: 'c' },
    ]);

    expect(groups).toEqual([
      {
        date: '2026-08-19',
        trips: [
          { departureDate: '2026-08-19', id: 'a' },
          { departureDate: '2026-08-19', id: 'b' },
        ],
      },
      { date: '2026-08-20', trips: [{ departureDate: '2026-08-20', id: 'c' }] },
    ]);
  });
});

describe('tripVehicleDisplay', () => {
  it('shows the planned count when no plates are assigned', () => {
    expect(tripVehicleCountLabel(3)).toBe('3 vozila');
    expect(tripVehicleDisplay({ vehicleCount: 3, vehicles: [] })).toBe('3 vozila');
  });

  it('shows plates and the planned count when more buses are booked than assigned', () => {
    expect(
      tripVehicleDisplay({
        vehicleCount: 3,
        vehicles: [
          { ...noKm, id: '1', make: 'Setra', model: 'S', licensePlate: 'NS 890-RT' },
          { ...noKm, id: '2', make: 'Setra', model: 'S', licensePlate: 'NS 778-RT' },
        ],
      }),
    ).toBe('NS 890-RT, NS 778-RT · 3 vozila');
  });
});

describe('tripVehicleDistanceKm', () => {
  it('is the difference of the readings', () => {
    expect(tripVehicleDistanceKm(184_350, 184_512.4)).toBe(162.4);
  });

  it('is null while a reading is missing or the end is before the start', () => {
    expect(tripVehicleDistanceKm(184_350, null)).toBeNull();
    expect(tripVehicleDistanceKm(184_512, 184_350)).toBeNull();
  });
});

describe('sumTripVehicleDistanceKm', () => {
  it('adds up the vehicles that have both readings', () => {
    expect(
      sumTripVehicleDistanceKm([
        { startKm: 100, endKm: 260 },
        { startKm: 5_000, endKm: 5_158 },
        { startKm: 900, endKm: null },
      ]),
    ).toBe(318);
  });

  it('is null when no vehicle has both readings', () => {
    expect(sumTripVehicleDistanceKm([{ startKm: 100, endKm: null }])).toBeNull();
    expect(sumTripVehicleDistanceKm([])).toBeNull();
  });
});
