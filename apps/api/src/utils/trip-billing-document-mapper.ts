import type { AttachedFileDto, TripBillingDocumentDto, TripBillingDocumentType } from '@rental-admin/shared';

import type { FileObjectRecord } from './file-mapper';

export interface TripBillingDocumentRecord {
  id: string;
  tripId: string;
  type: TripBillingDocumentType;
  documentNumber: string;
  issuedAt: Date;
  fileId: string | null;
  createdAt: Date;
  updatedAt: Date;
  file: FileObjectRecord | null;
}

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

const toFileDto = (file: FileObjectRecord | null): AttachedFileDto | null => {
  if (!file || file.status !== 'UPLOADED') {
    return null;
  }

  return {
    id: file.id,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
  };
};

export const toTripBillingDocumentDto = (record: TripBillingDocumentRecord): TripBillingDocumentDto => ({
  id: record.id,
  tripId: record.tripId,
  type: record.type,
  documentNumber: record.documentNumber,
  issuedAt: toIsoDate(record.issuedAt),
  file: toFileDto(record.file),
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});
