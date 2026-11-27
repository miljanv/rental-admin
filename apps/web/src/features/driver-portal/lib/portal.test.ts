import { describe, expect, it } from 'vitest';

import {
  advanceBalance,
  driverInitials,
  formatKm,
  kmProgress,
  kmReadingIssues,
  portalGreeting,
  portalHref,
  shortDateRange,
  tripDayProgress,
} from './portal';

describe('portal helpers', () => {
  it('builds portal links with the token in the path', () => {
    expect(portalHref('abc_DEF-1')).toBe('/v/abc_DEF-1');
    expect(portalHref('abc_DEF-1', 'trip_1')).toBe('/v/abc_DEF-1/trip_1');
  });

  it('formats kilometers, with a dash when unknown', () => {
    expect(formatKm(null)).toBe('—');
    expect(formatKm(162)).toContain('162');
  });

  it('greets by the time of day', () => {
    expect(portalGreeting(7)).toBe('Dobro jutro');
    expect(portalGreeting(12)).toBe('Dobar dan');
    expect(portalGreeting(21)).toBe('Dobro veče');
    expect(portalGreeting(1)).toBe('Dobro veče');
  });

  it('builds initials', () => {
    expect(driverInitials('milenko', 'Simić')).toBe('MS');
  });

  it('counts the day of a multi-day trip, clamped to the trip', () => {
    const trip = { departureDate: '2026-11-25', returnDate: '2026-11-28' };

    expect(tripDayProgress(trip, '2026-11-26')).toEqual({ day: 2, total: 4 });
    expect(tripDayProgress(trip, '2026-11-30')).toEqual({ day: 4, total: 4 });
    expect(
      tripDayProgress({ departureDate: '2026-11-25', returnDate: null }, '2026-11-25'),
    ).toEqual({ day: 1, total: 1 });
  });

  it('shortens date ranges', () => {
    expect(shortDateRange({ departureDate: '2026-11-25', returnDate: '2026-11-28' })).toBe(
      '25.–28.11.',
    );
    expect(shortDateRange({ departureDate: '2026-11-30', returnDate: '2026-12-02' })).toBe(
      '30.11.–2.12.',
    );
    expect(shortDateRange({ departureDate: '2026-11-25', returnDate: null })).toBe('25.11.');
  });

  it('counts odometer readings over all vehicles', () => {
    expect(
      kmProgress([
        { garageStartKm: 1, startKm: 2, endKm: null, garageEndKm: null },
        { garageStartKm: 5 },
      ]),
    ).toEqual({ filled: 3, total: 8 });
  });

  it('takes only cash, non-rejected costs off the advance', () => {
    expect(
      advanceBalance(15000, [
        { amount: 3000, paymentMethod: 'CASH' },
        { amount: 200, paymentMethod: 'CASH', status: 'REJECTED' },
        { amount: 9000, paymentMethod: 'COMPANY_CARD' },
      ]),
    ).toEqual({ received: 15000, cashSpent: 3000, remaining: 12000 });
  });

  it('wants each odometer step to continue from the one before', () => {
    expect(
      kmReadingIssues(
        { garageStartKm: 380_100, startKm: 380_120, endKm: '', garageEndKm: 380_050 },
        null,
      ),
    ).toEqual({ garageEndKm: expect.stringContaining('prethodnom koraku') });
  });

  it('refuses readings below the vehicle odometer before the trip day', () => {
    expect(kmReadingIssues({ garageStartKm: 379_900, startKm: 380_100 }, 380_000)).toEqual({
      garageStartKm: expect.stringContaining('trenutne kilometraže'),
    });
    expect(kmReadingIssues({ garageStartKm: 380_000, startKm: Number.NaN }, 380_000)).toEqual({});
  });
});
