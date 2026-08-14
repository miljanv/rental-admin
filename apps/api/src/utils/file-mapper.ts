import type { AttachedFileDto, FileObjectDto, FileStatus } from '@rental-admin/shared';

/**
 * Structural shape of a `FileObject` row. Declared here instead of importing the
 * generated Prisma type so this module stays usable in unit tests that never run
 * `prisma generate`.
 */
export interface FileObjectRecord {
  id: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  size: number;
  status: FileStatus;
  uploadedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Maps a database row to the client-facing DTO. `storageKey` is intentionally
 * dropped: clients never address S3 objects directly.
 */
export const toFileObjectDto = (record: FileObjectRecord): FileObjectDto => ({
  id: record.id,
  originalName: record.originalName,
  mimeType: record.mimeType,
  size: record.size,
  status: record.status,
  uploadedAt: record.uploadedAt?.toISOString() ?? null,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

/**
 * Minimal file summary attached to another record (driver document, vehicle
 * inspection, calibration, safety equipment, vehicle document). Only ever
 * surfaced once the upload is confirmed — a PENDING/FAILED file is not a
 * usable attachment yet.
 */
export const toAttachedFileDto = (file: FileObjectRecord | null): AttachedFileDto | null => {
  if (!file || file.status !== 'UPLOADED') {
    return null;
  }

  return { id: file.id, originalName: file.originalName, mimeType: file.mimeType, size: file.size };
};
