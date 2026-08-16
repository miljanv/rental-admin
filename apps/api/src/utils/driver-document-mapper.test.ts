import { describe, expect, it } from 'vitest';

import {
  toDriverDocumentDto,
  type DriverDocumentRecord,
} from './driver-document-mapper';

const record: DriverDocumentRecord = {
  id: 'doc_1',
  driverId: 'drv_1',
  type: 'LICENSE',
  documentNumber: 'LIC-001',
  issuedAt: new Date('2024-01-15T00:00:00.000Z'),
  expiresAt: new Date('2026-01-15T00:00:00.000Z'),
  employmentContractType: null,
  fileId: 'file_1',
  generationData: null,
  createdAt: new Date('2026-08-14T10:00:00.000Z'),
  updatedAt: new Date('2026-08-14T10:00:00.000Z'),
  file: {
    id: 'file_1',
    originalName: 'licenca.pdf',
    storageKey: 'secret/key.pdf',
    mimeType: 'application/pdf',
    size: 12_000,
    status: 'UPLOADED',
    uploadedAt: new Date('2026-08-14T10:00:00.000Z'),
    createdAt: new Date('2026-08-14T10:00:00.000Z'),
    updatedAt: new Date('2026-08-14T10:00:00.000Z'),
  },
};

describe('toDriverDocumentDto', () => {
  it('maps dates and omits the storage key from the scan', () => {
    const dto = toDriverDocumentDto(record);

    expect(dto.issuedAt).toBe('2024-01-15');
    expect(dto.expiresAt).toBe('2026-01-15');
    expect(dto.file).toEqual({
      id: 'file_1',
      originalName: 'licenca.pdf',
      mimeType: 'application/pdf',
      size: 12_000,
    });
    expect(dto).not.toHaveProperty('fileId');
    expect(JSON.stringify(dto)).not.toContain('secret/key.pdf');
  });

  it('hides a scan that is not uploaded', () => {
    expect(
      toDriverDocumentDto({
        ...record,
        file: record.file ? { ...record.file, status: 'PENDING' } : null,
      }).file,
    ).toBeNull();
  });
});
