import { describe, expect, it } from 'vitest';

import { toAbsenceAttestationDto, type AbsenceAttestationRecord } from './absence-attestation-mapper';

const record: AbsenceAttestationRecord = {
  id: 'abs_1',
  driverId: 'drv_1',
  periodFrom: new Date('2026-06-17T19:30:00.000Z'),
  periodTo: new Date('2026-06-20T10:00:00.000Z'),
  reason: 'LEAVE_OR_REST',
  otherReason: null,
  place: 'Novi Sad',
  issuedAt: new Date('2026-06-20T00:00:00.000Z'),
  startedWorkAt: new Date('2026-04-03T00:00:00.000Z'),
  fileId: 'file_1',
  createdAt: new Date('2026-08-14T10:00:00.000Z'),
  updatedAt: new Date('2026-08-14T10:00:00.000Z'),
  file: {
    id: 'file_1',
    originalName: 'potvrda.pdf',
    storageKey: 'secret/key.pdf',
    mimeType: 'application/pdf',
    size: 8_000,
    status: 'UPLOADED',
    uploadedAt: new Date('2026-08-14T10:00:00.000Z'),
    createdAt: new Date('2026-08-14T10:00:00.000Z'),
    updatedAt: new Date('2026-08-14T10:00:00.000Z'),
  },
};

describe('toAbsenceAttestationDto', () => {
  it('maps timestamps and omits the storage key', () => {
    const dto = toAbsenceAttestationDto(record);

    expect(dto.periodFrom).toBe('2026-06-17T19:30:00.000Z');
    expect(dto.issuedAt).toBe('2026-06-20');
    expect(dto.file).toEqual({
      id: 'file_1',
      originalName: 'potvrda.pdf',
      mimeType: 'application/pdf',
      size: 8_000,
    });
    expect(JSON.stringify(dto)).not.toContain('secret/key.pdf');
  });
});
