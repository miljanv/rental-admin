import { describe, expect, it } from 'vitest';

import {
  daysUntilExpiry,
  getDocumentExpiryUrgency,
  toDocumentStatusItems,
  type DriverDocumentDto,
} from './driver-document';

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

const document = (
  type: DriverDocumentDto['type'],
  issuedAt: string,
  expiresAt: string | null,
): DriverDocumentDto => ({
  id: `${type}-${issuedAt}`,
  driverId: 'drv_1',
  type,
  documentNumber: '1',
  issuedAt,
  expiresAt,
  employmentContractType: type === 'EMPLOYMENT_CONTRACT' ? 'FIXED_TERM' : null,
  file: null,
  createdAt: `${issuedAt}T00:00:00.000Z`,
  updatedAt: `${issuedAt}T00:00:00.000Z`,
});

describe('toDocumentStatusItems', () => {
  it('keeps the latest document per type and sorts expired first', () => {
    const items = toDocumentStatusItems(
      [
        document('LICENSE', '2025-01-01', '2027-01-01'),
        document('LICENSE', '2026-01-01', '2026-08-01'),
        document('MEDICAL_CERTIFICATE', '2026-06-01', '2026-09-01'),
      ],
      '2026-08-14',
    );

    expect(items.map((item) => item.type)).toEqual([
      'LICENSE',
      'MEDICAL_CERTIFICATE',
      'EMPLOYMENT_CONTRACT',
      'MA_FORM',
      'ACCREDITATION',
      'DRIVING_LICENSE',
    ]);
    expect(items[0]?.document?.expiresAt).toBe('2026-08-01');
    expect(items[1]?.document?.expiresAt).toBe('2026-09-01');
    expect(items[2]?.document).toBeNull();
  });
});
