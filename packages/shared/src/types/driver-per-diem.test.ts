import { describe, expect, it } from 'vitest';

import {
  averageMonthlyEarnings,
  buildTravelHoursBreakdown,
  isDomesticCountry,
  perDiemUnitsFromHours,
  splitDomesticTaxable,
  tripDistanceKm,
  workingDaysInRange,
  DOMESTIC_PER_DIEM_RATE_RSD,
  FOREIGN_PER_DIEM_RATE_EUR,
} from './driver-per-diem';

describe('isDomesticCountry', () => {
  it('treats empty and Serbia variants as domestic', () => {
    expect(isDomesticCountry(null)).toBe(true);
    expect(isDomesticCountry('')).toBe(true);
    expect(isDomesticCountry('Srbija')).toBe(true);
    expect(isDomesticCountry('SRBIJA')).toBe(true);
    expect(isDomesticCountry('Republic of Serbia')).toBe(true);
  });

  it('treats other countries as foreign', () => {
    expect(isDomesticCountry('Rumunija')).toBe(false);
    expect(isDomesticCountry('Hrvatska')).toBe(false);
  });
});

describe('perDiemUnitsFromHours', () => {
  it('applies 0 / 0.5 / 1 bands under 24h', () => {
    expect(perDiemUnitsFromHours(0)).toBe(0);
    expect(perDiemUnitsFromHours(5.9)).toBe(0);
    expect(perDiemUnitsFromHours(6)).toBe(0.5);
    expect(perDiemUnitsFromHours(11.9)).toBe(0.5);
    expect(perDiemUnitsFromHours(12)).toBe(1);
    expect(perDiemUnitsFromHours(23.9)).toBe(1);
  });

  it('stacks full days then the remainder band', () => {
    expect(perDiemUnitsFromHours(24)).toBe(1);
    expect(perDiemUnitsFromHours(24 + 5)).toBe(1);
    expect(perDiemUnitsFromHours(24 + 6)).toBe(1.5);
    expect(perDiemUnitsFromHours(24 * 5 + 9.183)).toBe(5.5);
    expect(perDiemUnitsFromHours(18.333)).toBe(1);
  });
});

describe('buildTravelHoursBreakdown', () => {
  it('splits Serbia and abroad hours across border crossings', () => {
    const result = buildTravelHoursBreakdown({
      departureAt: '2024-05-07T19:40:00',
      returnAt: '2024-05-13T23:15:00',
      borderCrossings: [
        { at: '2024-05-08T05:15:00', direction: 'OUT' },
        { at: '2024-05-13T14:30:00', direction: 'IN' },
      ],
    });

    expect(result.domesticUnits).toBe(1);
    expect(result.foreignUnits).toBe(5.5);
    expect(result.domesticAmountRsd).toBe(1 * DOMESTIC_PER_DIEM_RATE_RSD);
    expect(result.foreignAmountEur).toBe(5.5 * FOREIGN_PER_DIEM_RATE_EUR);
    expect(result.daySegments.some((segment) => segment.zone === 'FOREIGN')).toBe(true);
  });

  it('keeps a domestic-only trip entirely in Serbia', () => {
    const result = buildTravelHoursBreakdown({
      departureAt: '2026-09-26T08:00:00',
      returnAt: '2026-09-26T20:00:00',
      borderCrossings: [],
    });

    expect(result.domesticHours).toBe(12);
    expect(result.foreignHours).toBe(0);
    expect(result.domesticUnits).toBe(1);
    expect(result.foreignUnits).toBe(0);
  });
});

describe('tripDistanceKm', () => {
  it('prefers distanceKm then odometer fallback', () => {
    expect(tripDistanceKm({ distanceKm: 450, startKm: 1, endKm: 2 })).toBe(450);
    expect(tripDistanceKm({ distanceKm: null, startKm: 100000, endKm: 100450 })).toBe(450);
    expect(tripDistanceKm({ distanceKm: null, startKm: null, endKm: null })).toBeNull();
  });
});

describe('workingDaysInRange', () => {
  it('counts distinct days and clamps to the range', () => {
    expect(
      workingDaysInRange(
        [
          { from: '2026-09-28', to: '2026-10-02' },
          { from: '2026-09-30', to: '2026-09-30' },
        ],
        '2026-09-01',
        '2026-09-30',
      ),
    ).toBe(3);
  });
});

describe('averageMonthlyEarnings', () => {
  it('averages only months with pay', () => {
    expect(
      averageMonthlyEarnings([
        { perDiemAmount: 10000 },
        { perDiemAmount: 0 },
        { perDiemAmount: 20000 },
      ]),
    ).toBe(15000);
    expect(averageMonthlyEarnings([{ perDiemAmount: 0 }])).toBeNull();
  });
});

describe('splitDomesticTaxable', () => {
  it('splits entered RSD against the non-taxable ceiling', () => {
    expect(splitDomesticTaxable(3400)).toEqual({ withinCap: 3400, aboveCap: 0 });
    expect(splitDomesticTaxable(5000)).toEqual({ withinCap: 3400, aboveCap: 1600 });
  });
});
