import type { AbsenceAttestationDto, AbsenceReason } from '@rental-admin/shared';

import type { FileObjectRecord } from './file-mapper';

export interface AbsenceAttestationRecord {
  id: string;
  driverId: string;
  periodFrom: Date;
  periodTo: Date;
  reason: AbsenceReason;
  otherReason: string | null;
  place: string;
  issuedAt: Date;
  startedWorkAt: Date;
  fileId: string;
  createdAt: Date;
  updatedAt: Date;
  file: FileObjectRecord | null;
}

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

export const toAbsenceAttestationDto = (record: AbsenceAttestationRecord): AbsenceAttestationDto => ({
  id: record.id,
  driverId: record.driverId,
  periodFrom: record.periodFrom.toISOString(),
  periodTo: record.periodTo.toISOString(),
  reason: record.reason,
  otherReason: record.otherReason,
  place: record.place,
  issuedAt: toIsoDate(record.issuedAt),
  startedWorkAt: toIsoDate(record.startedWorkAt),
  file:
    record.file && record.file.status === 'UPLOADED'
      ? {
          id: record.file.id,
          originalName: record.file.originalName,
          mimeType: record.file.mimeType,
          size: record.file.size,
        }
      : null,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});
