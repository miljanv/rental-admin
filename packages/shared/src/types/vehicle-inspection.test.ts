import { describe, expect, it } from 'vitest';

import {
  addUtcMonths,
  computeInspectionExpiry,
  earliestScheduleDate,
} from './vehicle-inspection';

describe('addUtcMonths', () => {
  it('handles day overflow (Jan 31 + 1 month)', () => {
    expect(addUtcMonths('2026-01-31', 1)).toBe('2026-03-03');
  });

  it('adds whole years via 12 months', () => {
    expect(addUtcMonths('2026-08-14', 12)).toBe('2027-08-14');
  });
});

describe('computeInspectionExpiry', () => {
  it('regular inspections expire 1 year after the inspection date', () => {
    expect(computeInspectionExpiry('REGULAR', '2026-08-14')).toBe('2027-08-14');
  });

  it('semi-annual inspections expire 6 months after the inspection date', () => {
    expect(computeInspectionExpiry('SEMI_ANNUAL', '2026-08-14')).toBe('2027-02-14');
  });

  it('monthly inspections expire 30 days after the inspection date', () => {
    expect(computeInspectionExpiry('MONTHLY', '2026-08-14')).toBe('2026-09-13');
  });
});

describe('earliestScheduleDate', () => {
  it('is 30 days before expiry for regular inspections', () => {
    expect(earliestScheduleDate('REGULAR', '2027-08-14')).toBe('2027-07-15');
  });

  it('is 15 days before expiry for semi-annual inspections', () => {
    expect(earliestScheduleDate('SEMI_ANNUAL', '2027-02-14')).toBe('2027-01-30');
  });

  it('has no early window for monthly inspections', () => {
    expect(earliestScheduleDate('MONTHLY', '2026-09-13')).toBeNull();
  });
});
