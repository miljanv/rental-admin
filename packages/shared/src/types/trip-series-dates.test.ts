import { describe, expect, it } from 'vitest';

import { buildTripSeriesOccurrenceDates } from './trip';

describe('buildTripSeriesOccurrenceDates', () => {
  it('builds every day in a daily January schedule', () => {
    const dates = buildTripSeriesOccurrenceDates({
      frequency: 'DAILY',
      daysOfWeek: [],
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      pauses: [],
    });

    expect(dates).toHaveLength(31);
    expect(dates[0]).toBe('2026-01-01');
    expect(dates.at(-1)).toBe('2026-01-31');
  });

  it('shows the accidental January-to-October schedule as 255 rides', () => {
    const dates = buildTripSeriesOccurrenceDates({
      frequency: 'WEEKLY',
      daysOfWeek: [1, 2, 3, 4, 5, 6],
      startDate: '2026-01-08',
      endDate: '2026-10-31',
      pauses: [],
    });

    expect(dates).toHaveLength(255);
    expect(dates[0]).toBe('2026-01-08');
    expect(dates.at(-1)).toBe('2026-10-31');
  });

  it('excludes pauses and weekdays that were not selected', () => {
    const dates = buildTripSeriesOccurrenceDates({
      frequency: 'WEEKLY',
      daysOfWeek: [1, 2, 3, 4, 5],
      startDate: '2026-01-01',
      endDate: '2026-01-10',
      pauses: [{ startDate: '2026-01-05', endDate: '2026-01-06' }],
    });

    expect(dates).toEqual(['2026-01-01', '2026-01-02', '2026-01-07', '2026-01-08', '2026-01-09']);
  });

  it('rejects calendar dates that do not exist', () => {
    expect(
      buildTripSeriesOccurrenceDates({
        frequency: 'DAILY',
        daysOfWeek: [],
        startDate: '2026-02-30',
        endDate: '2026-03-02',
        pauses: [],
      }),
    ).toEqual([]);
  });
});
