import { describe, expect, it } from 'vitest';

import { announcementStatus } from './announcement-status';

const now = new Date('2026-11-10T12:00:00.000Z');

describe('announcementStatus', () => {
  it('is scheduled before the start', () => {
    expect(announcementStatus({ startsAt: '2026-11-11T00:00:00.000Z', endsAt: null }, now)).toBe(
      'SCHEDULED',
    );
  });

  it('is active inside the period, or forever without an end', () => {
    expect(
      announcementStatus(
        { startsAt: '2026-11-09T00:00:00.000Z', endsAt: '2026-11-11T00:00:00.000Z' },
        now,
      ),
    ).toBe('ACTIVE');
    expect(announcementStatus({ startsAt: '2026-11-09T00:00:00.000Z', endsAt: null }, now)).toBe(
      'ACTIVE',
    );
  });

  it('is expired from the end on', () => {
    expect(
      announcementStatus(
        { startsAt: '2026-11-01T00:00:00.000Z', endsAt: '2026-11-10T12:00:00.000Z' },
        now,
      ),
    ).toBe('EXPIRED');
  });
});
