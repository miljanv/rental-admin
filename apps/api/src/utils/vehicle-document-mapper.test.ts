import { describe, expect, it } from 'vitest';

import { toVehicleDocumentDto, type VehicleDocumentRecord } from './vehicle-document-mapper';

const record: VehicleDocumentRecord = {
  id: 'doc_1',
  vehicleId: 'veh_1',
  type: 'REGISTRATION',
  issuedAt: new Date('2026-08-14T00:00:00.000Z'),
  fileId: null,
  createdAt: new Date('2026-08-14T10:00:00.000Z'),
  updatedAt: new Date('2026-08-14T10:00:00.000Z'),
  file: null,
};

describe('toVehicleDocumentDto', () => {
  it('exposes issuedAt as YYYY-MM-DD and a null file when unattached', () => {
    expect(toVehicleDocumentDto(record)).toMatchObject({
      id: 'doc_1',
      type: 'REGISTRATION',
      issuedAt: '2026-08-14',
      file: null,
    });
  });

  it('maps a null issuedAt to null', () => {
    expect(toVehicleDocumentDto({ ...record, issuedAt: null }).issuedAt).toBeNull();
  });
});
