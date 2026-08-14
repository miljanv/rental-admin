import { describe, expect, it } from 'vitest';

import { daysUntilExpiry, getDocumentExpiryUrgency } from './driver-document';

describe('getDocumentExpiryUrgency', () => {
  it('returns none when there is no expiry', () => {
    expect(getDocumentExpiryUrgency(null, '2026-08-14')).toBe('none');
  });

  it('classifies overdue, upcoming and distant dates', () => {
    expect(getDocumentExpiryUrgency('2026-08-01', '2026-08-14')).toBe('expired');
    expect(getDocumentExpiryUrgency('2026-08-20', '2026-08-14')).toBe('critical');
    expect(getDocumentExpiryUrgency('2026-09-01', '2026-08-14')).toBe('warning');
    expect(getDocumentExpiryUrgency('2027-01-01', '2026-08-14')).toBe('ok');
  });
});

describe('daysUntilExpiry', () => {
  it('counts calendar days including today as zero', () => {
    expect(daysUntilExpiry('2026-08-14', '2026-08-14')).toBe(0);
    expect(daysUntilExpiry('2026-08-21', '2026-08-14')).toBe(7);
    expect(daysUntilExpiry('2026-08-01', '2026-08-14')).toBe(-13);
  });
});
