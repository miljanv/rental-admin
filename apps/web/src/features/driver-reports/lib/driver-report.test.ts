import { describe, expect, it } from 'vitest';

import { driverReportKm, formatReportKm, reviewedLabel } from './driver-report';

const vehicle = (startKm: number | null, endKm: number | null) => ({
  vehicleId: 'veh',
  licensePlate: 'BG-1',
  startKm,
  endKm,
  distanceKm: null,
  currentKmSource: null,
});

describe('driver report helpers', () => {
  it('sums the complete vehicle readings', () => {
    expect(driverReportKm({ vehicles: [vehicle(100, 260), vehicle(5_000, 5_158)] })).toBe(318);
    expect(driverReportKm({ vehicles: [vehicle(100, null)] })).toBeNull();
  });

  it('formats kilometers with a dash when unknown', () => {
    expect(formatReportKm(null)).toBe('—');
    expect(formatReportKm(318)).toContain('318');
  });

  it('names who handled the report when known', () => {
    expect(reviewedLabel({ reviewedBy: null, reviewedAt: null })).toBe('Unos je obrađen.');
    expect(reviewedLabel({ reviewedBy: { id: 'u', username: 'stefan' }, reviewedAt: null })).toBe(
      'Unos je obrađen (stefan).',
    );
  });
});
