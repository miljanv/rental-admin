import type {
  DriverDocumentDto,
  ExpiringDriverDocumentDto,
  DriverDocumentFileDto,
  DriverDocumentType,
  EmploymentContractType,
} from '@rental-admin/shared';

import type { FileObjectRecord } from './file-mapper';

export interface DriverDocumentRecord {
  id: string;
  driverId: string;
  type: DriverDocumentType;
  documentNumber: string;
  issuedAt: Date;
  expiresAt: Date | null;
  employmentContractType: EmploymentContractType | null;
  fileId: string | null;
  createdAt: Date;
  updatedAt: Date;
  file: FileObjectRecord | null;
}

export interface DriverSummaryRecord {
  id: string;
  firstName: string;
  lastName: string;
}

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

const toFileDto = (file: FileObjectRecord | null): DriverDocumentFileDto | null => {
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

export const toDriverDocumentDto = (record: DriverDocumentRecord): DriverDocumentDto => ({
  id: record.id,
  driverId: record.driverId,
  type: record.type,
  documentNumber: record.documentNumber,
  issuedAt: toIsoDate(record.issuedAt),
  expiresAt: record.expiresAt ? toIsoDate(record.expiresAt) : null,
  employmentContractType: record.employmentContractType,
  file: toFileDto(record.file),
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

export const toExpiringDriverDocumentDto = (
  record: DriverDocumentRecord & { driver: DriverSummaryRecord },
): ExpiringDriverDocumentDto => ({
  ...toDriverDocumentDto(record),
  driver: {
    id: record.driver.id,
    firstName: record.driver.firstName,
    lastName: record.driver.lastName,
  },
});
