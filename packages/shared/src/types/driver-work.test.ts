import { describe, expect, it } from 'vitest';

import {
  dayOverlapsPeriod,
  evaluateAetrCompliance,
  longestConsecutiveDays,
  utcMonthRangeIso,
} from './driver-work';

describe('utcMonthRangeIso', () => {
  it('returns the first and last UTC day of the month', () => {
    expect(utcMonthRangeIso(new Date('2026-08-15T10:00:00.000Z'))).toEqual({
      from: '2026-08-01',
      to: '2026-08-31',
    });
  });
});

describe('dayOverlapsPeriod', () => {
  it('treats the absence window as inclusive calendar days', () => {
    const from = '2026-06-17T19:30:00.000Z';
    const to = '2026-06-20T10:00:00.000Z';

    expect(dayOverlapsPeriod('2026-06-18', from, to)).toBe(true);
    expect(dayOverlapsPeriod('2026-06-16', from, to)).toBe(false);
  });
});

describe('longestConsecutiveDays', () => {
  it('counts a contiguous run and ignores duplicates', () => {
    expect(longestConsecutiveDays(['2026-08-01', '2026-08-03', '2026-08-02', '2026-08-02'])).toBe(3);
    expect(longestConsecutiveDays(['2026-08-01', '2026-08-03'])).toBe(1);
    expect(longestConsecutiveDays([])).toBe(0);
  });
});

describe('evaluateAetrCompliance', () => {
  it('is ok when drives do not clash with absences or a 7-day streak', () => {
    const result = evaluateAetrCompliance(['2026-08-03', '2026-08-04', '2026-08-10'], []);

    expect(result.status).toBe('ok');
    expect(result.findings).toEqual([]);
    expect(result.hoursAvailable).toBe(false);
  });

  it('flags a fill-up that falls inside an absence attestation', () => {
    const result = evaluateAetrCompliance(['2026-06-18'], [
      {
        periodFrom: '2026-06-17T19:30:00.000Z',
        periodTo: '2026-06-20T10:00:00.000Z',
        reason: 'LEAVE_OR_REST',
      },
    ]);

    expect(result.status).toBe('breach');
    expect(result.findings[0]?.code).toBe('DRIVE_DURING_ABSENCE');
    expect(result.findings[0]?.detail).toBe('2026-06-18');
  });

  it('warns after seven consecutive driving days', () => {
    const days = ['01', '02', '03', '04', '05', '06', '07'].map((day) => `2026-08-${day}`);
    const result = evaluateAetrCompliance(days, []);

    expect(result.status).toBe('warning');
    expect(result.findings[0]).toEqual({
      code: 'WEEKLY_REST_GAP',
      severity: 'warning',
      detail: '7',
    });
  });
});
