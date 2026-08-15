import { describe, expect, it } from 'vitest';

import { bulkUpdateTripSeriesSchema, generateTripSeriesSchema } from './trip-series';

const validSeries = {
  frequency: 'DAILY',
  startDate: '2026-09-01',
  endDate: '2026-09-30',
  referenceNumber: 'RN-COKA',
  route: 'Čoka - OŠ Čoka',
} as const;

describe('generateTripSeriesSchema', () => {
  it('accepts a daily series', () => {
    expect(generateTripSeriesSchema.safeParse(validSeries).success).toBe(true);
  });

  it('rejects an end date before the start date', () => {
    const result = generateTripSeriesSchema.safeParse({
      ...validSeries,
      startDate: '2026-09-30',
      endDate: '2026-09-01',
    });

    expect(result.success).toBe(false);
  });

  it('requires at least one weekday when frequency is WEEKLY', () => {
    const result = generateTripSeriesSchema.safeParse({
      ...validSeries,
      frequency: 'WEEKLY',
      daysOfWeek: [],
    });

    expect(result.success).toBe(false);
  });

  it('accepts a weekly series with weekdays selected', () => {
    const result = generateTripSeriesSchema.safeParse({
      ...validSeries,
      frequency: 'WEEKLY',
      daysOfWeek: [1, 2, 3, 4, 5],
    });

    expect(result.success).toBe(true);
  });
});

describe('bulkUpdateTripSeriesSchema', () => {
  it('rejects a payload with no field to update', () => {
    expect(bulkUpdateTripSeriesSchema.safeParse({ fromDate: '2026-09-15' }).success).toBe(false);
  });

  it('accepts a payload that only changes the vehicle', () => {
    const result = bulkUpdateTripSeriesSchema.safeParse({
      fromDate: '2026-09-15',
      vehicleIds: ['vehicle_2'],
    });

    expect(result.success).toBe(true);
  });
});
