import { describe, expect, it } from 'vitest';

import {
  buildAlarmItem,
  countAlarms,
  defaultThresholdForKind,
  filterAlarms,
  mergeAlarmThresholds,
  topAlarms,
} from './alarm';

const thresholds = defaultThresholdForKind('DRIVER_LICENSE');

const item = (
  id: string,
  expiresAt: string,
  extras: Partial<ReturnType<typeof buildAlarmItem>> = {},
) => ({
  ...buildAlarmItem({
    id,
    kind: 'DRIVER_LICENSE',
    expiresAt,
    todayIso: '2026-08-15',
    thresholds,
    href: `/drivers/${id}`,
    driver: { id, label: 'Milan Đurić' },
  }),
  ...extras,
});

describe('mergeAlarmThresholds', () => {
  it('fills missing kinds with the default 7 / 30 window', () => {
    const merged = mergeAlarmThresholds([
      { kind: 'DRIVER_LICENSE', criticalDays: 3, warningDays: 14 },
    ]);
    const license = merged.find((row) => row.kind === 'DRIVER_LICENSE');
    const medical = merged.find((row) => row.kind === 'DRIVER_MEDICAL_CERTIFICATE');

    expect(license).toEqual({ kind: 'DRIVER_LICENSE', criticalDays: 3, warningDays: 14 });
    expect(medical).toEqual({
      kind: 'DRIVER_MEDICAL_CERTIFICATE',
      criticalDays: 7,
      warningDays: 30,
    });
    expect(merged).toHaveLength(12);
  });
});

describe('buildAlarmItem', () => {
  it('marks overdue dates as expired and upcoming as critical or warning', () => {
    expect(item('a', '2026-08-01').urgency).toBe('expired');
    expect(item('b', '2026-08-20').urgency).toBe('critical');
    expect(item('c', '2026-09-01').urgency).toBe('warning');
    expect(item('d', '2027-01-01').urgency).toBe('ok');
  });

  it('respects a tighter custom threshold', () => {
    const tight = buildAlarmItem({
      id: 'x',
      kind: 'VEHICLE_INSPECTION_MONTHLY',
      expiresAt: '2026-08-25',
      todayIso: '2026-08-15',
      thresholds: { criticalDays: 3, warningDays: 7 },
      href: '/vehicles/v1',
      vehicle: { id: 'v1', label: 'Setra (NS-001-AA)' },
    });

    expect(tight.urgency).toBe('ok');
    expect(tight.category).toBe('VEHICLE');
  });
});

describe('countAlarms and topAlarms', () => {
  const items = [
    item('ok', '2027-01-01'),
    item('expired', '2026-08-01'),
    item('warn', '2026-09-01'),
    item('crit', '2026-08-18'),
  ];

  it('counts each urgency bucket', () => {
    expect(countAlarms(items)).toEqual({
      expired: 1,
      critical: 1,
      warning: 1,
      ok: 1,
      total: 4,
    });
  });

  it('returns expired first, then soonest remaining', () => {
    expect(topAlarms(items, 3).map((row) => row.id)).toEqual(['expired', 'crit', 'warn']);
  });
});

describe('filterAlarms', () => {
  it('filters by urgency and driver', () => {
    const items = [
      item('a', '2026-08-01'),
      {
        ...item('b', '2026-09-01'),
        driver: { id: 'other', label: 'Ana' },
      },
    ];

    expect(filterAlarms(items, { urgency: 'expired' })).toHaveLength(1);
    expect(filterAlarms(items, { driverId: 'other' }).map((row) => row.id)).toEqual(['b']);
  });
});
