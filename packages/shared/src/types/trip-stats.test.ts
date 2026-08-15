import { describe, expect, it } from 'vitest';

import { buildTripStats, type TripStatsRow } from './trip-stats';

const row = (overrides: Partial<TripStatsRow>): TripStatsRow => ({
  status: 'COMPLETED',
  departureDate: '2026-09-05',
  route: 'Novi Sad - Zlatibor',
  price: 50000,
  paymentMethod: 'ACCOUNT',
  distanceKm: 250,
  partnerId: 'partner_1',
  partnerLabel: 'Sunny Travel doo',
  clientName: null,
  ...overrides,
});

describe('buildTripStats', () => {
  it('sums distance and revenue, excluding cancelled trips from revenue', () => {
    const rows = [
      row({}),
      row({ status: 'CANCELLED', price: 30000, distanceKm: 100 }),
    ];

    const stats = buildTripStats(rows, '2026-09-01', '2026-09-30');

    expect(stats.totalTrips).toBe(2);
    expect(stats.totalDistanceKm).toBe(350);
    expect(stats.totalRevenue).toBe(50000);
  });

  it('counts trips by status', () => {
    const rows = [row({ status: 'PLANNED' }), row({ status: 'PLANNED' }), row({ status: 'COMPLETED' })];
    const stats = buildTripStats(rows, '2026-09-01', '2026-09-30');

    expect(stats.byStatus).toEqual(
      expect.arrayContaining([
        { status: 'PLANNED', count: 2 },
        { status: 'COMPLETED', count: 1 },
      ]),
    );
  });

  it('ranks top routes and top partners by trip count', () => {
    const rows = [
      row({ route: 'Ruta A' }),
      row({ route: 'Ruta A' }),
      row({ route: 'Ruta B' }),
      row({ partnerId: 'partner_2', partnerLabel: 'Drugi partner' }),
    ];
    const stats = buildTripStats(rows, '2026-09-01', '2026-09-30');

    expect(stats.topRoutes[0]).toEqual({ route: 'Ruta A', count: 2 });
    expect(stats.topPartners.find((p) => p.partnerId === 'partner_1')?.count).toBe(3);
  });

  it('pre-seeds every month in the range even with no data', () => {
    const stats = buildTripStats([], '2026-07-01', '2026-09-30');

    expect(stats.monthly).toHaveLength(3);
    expect(stats.monthly.map((m) => m.month)).toEqual([7, 8, 9]);
  });
});
