import { describe, expect, it } from 'vitest';

import { groupTripsByDepartureDate, tripVehicleCountLabel, tripVehicleDisplay } from './trip';

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
          { id: '1', make: 'Setra', model: 'S', licensePlate: 'NS 890-RT' },
          { id: '2', make: 'Setra', model: 'S', licensePlate: 'NS 778-RT' },
        ],
      }),
    ).toBe('NS 890-RT, NS 778-RT · 3 vozila');
  });
});
