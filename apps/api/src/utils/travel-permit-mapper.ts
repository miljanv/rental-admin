import type { TravelPermitDto } from '@rental-admin/shared';

import type { FileObjectRecord } from './file-mapper';

export interface TravelPermitRecord {
  id: string;
  contractId: string;
  country: string;
  permitNumber: string;
  issuedAt: Date;
  fileId: string;
  createdAt: Date;
  updatedAt: Date;
  file: FileObjectRecord;
}

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

export const toTravelPermitDto = (record: TravelPermitRecord): TravelPermitDto => ({
  id: record.id,
  contractId: record.contractId,
  country: record.country,
  permitNumber: record.permitNumber,
  issuedAt: toIsoDate(record.issuedAt),
  fileId: record.file.id,
  originalName: record.file.originalName,
  mimeType: record.file.mimeType,
  size: record.file.size,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});
