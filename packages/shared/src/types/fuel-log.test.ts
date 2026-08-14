import { describe, expect, it } from 'vitest';

import { computeFuelLogDerivedFields } from './fuel-log';

describe('computeFuelLogDerivedFields', () => {
  it('returns nulls when there is no previous reading', () => {
    expect(computeFuelLogDerivedFields(100_000, null, 40)).toEqual({
      kmDriven: null,
      consumptionPer100Km: null,
    });
  });

  it('computes km driven and L/100km against the previous reading', () => {
    // 500 km driven, 40 liters -> 8 L/100km
    expect(computeFuelLogDerivedFields(100_500, 100_000, 40)).toEqual({
      kmDriven: 500,
      consumptionPer100Km: 8,
    });
  });

  it('rounds consumption to 2 decimals', () => {
    // 300 km driven, 25 liters -> 8.333... L/100km
    const result = computeFuelLogDerivedFields(100_300, 100_000, 25);
    expect(result.kmDriven).toBe(300);
    expect(result.consumptionPer100Km).toBe(8.33);
  });

  it('guards against a non-advancing or reversed odometer (divide by zero)', () => {
    expect(computeFuelLogDerivedFields(100_000, 100_000, 40)).toEqual({
      kmDriven: 0,
      consumptionPer100Km: null,
    });
    expect(computeFuelLogDerivedFields(99_000, 100_000, 40)).toEqual({
      kmDriven: -1000,
      consumptionPer100Km: null,
    });
  });
});
