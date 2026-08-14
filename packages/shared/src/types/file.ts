export const FILE_STATUSES = ['PENDING', 'UPLOADED', 'FAILED'] as const;

export type FileStatus = (typeof FILE_STATUSES)[number];

/**
 * File representation returned to clients. The S3 storage key is deliberately
 * omitted: the browser never addresses S3 objects directly, it only follows
 * presigned URLs issued by the API.
 */
export interface FileObjectDto {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: FileStatus;
  uploadedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PresignUploadResult {
  fileId: string;
  storageKey: string;
  uploadUrl: string;
  /** Lifetime of `uploadUrl` in seconds. */
  expiresIn: number;
}

export interface DownloadUrlResult {
  downloadUrl: string;
  fileName: string;
  /** Lifetime of `downloadUrl` in seconds. */
  expiresIn: number;
}

export interface PreviewUrlResult {
  previewUrl: string;
  fileName: string;
  /** Lifetime of `previewUrl` in seconds. */
  expiresIn: number;
}

export interface DeleteFileResult {
  id: string;
  deleted: true;
}

/**
 * Minimal summary of an uploaded scan/photo attached to another record
 * (driver document, vehicle inspection, calibration, safety equipment,
 * vehicle document). Shared so every "attach a file" DTO stays in sync
 * instead of redeclaring the same four fields.
 */
export interface AttachedFileDto {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
}
