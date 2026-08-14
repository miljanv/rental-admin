import type { VehicleDocumentDto, VehicleDocumentType } from '@rental-admin/shared';

import { toAttachedFileDto, type FileObjectRecord } from './file-mapper';

export interface VehicleDocumentRecord {
  id: string;
  vehicleId: string;
  type: VehicleDocumentType;
  issuedAt: Date | null;
  fileId: string | null;
  createdAt: Date;
  updatedAt: Date;
  file: FileObjectRecord | null;
}

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

export const toVehicleDocumentDto = (record: VehicleDocumentRecord): VehicleDocumentDto => ({
  id: record.id,
  vehicleId: record.vehicleId,
  type: record.type,
  issuedAt: record.issuedAt ? toIsoDate(record.issuedAt) : null,
  file: toAttachedFileDto(record.file),
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});
