/**
 * Upload constraints and the MIME allow-list shared by the API and the web app.
 * Both sides validate against the same source of truth so the browser and the
 * server can never disagree about what is acceptable.
 */

export const BYTES_IN_MEGABYTE = 1024 * 1024;

/** Fallback limit. The API can lower it through MAX_FILE_SIZE_MB. */
export const DEFAULT_MAX_FILE_SIZE_MB = 25;

export const megabytesToBytes = (megabytes: number): number => megabytes * BYTES_IN_MEGABYTE;

export const DEFAULT_MAX_FILE_SIZE_BYTES = megabytesToBytes(DEFAULT_MAX_FILE_SIZE_MB);

/**
 * Allow-listed MIME types. Windows browsers report a few non-standard values
 * (for example `application/x-zip-compressed` for ZIP archives), so those
 * aliases are included on purpose.
 *
 * SVG is intentionally excluded: it can carry executable script and would run
 * in the S3 origin when opened through a presigned URL.
 */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MIME_TYPE_LABELS: Record<AllowedMimeType, string> = {
  'image/jpeg': 'JPEG image',
  'image/png': 'PNG image',
  'image/gif': 'GIF image',
  'image/webp': 'WebP image',
  'application/pdf': 'PDF document',
  'text/plain': 'Text file',
  'text/csv': 'CSV spreadsheet',
  'application/msword': 'Word document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word document',
  'application/vnd.ms-excel': 'Excel spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel spreadsheet',
  'application/zip': 'ZIP archive',
  'application/x-zip-compressed': 'ZIP archive',
};

/** Value for the `accept` attribute of a file input. */
export const FILE_INPUT_ACCEPT = [
  ...ALLOWED_MIME_TYPES,
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.pdf',
  '.txt',
  '.csv',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.zip',
].join(',');

export const isAllowedMimeType = (mimeType: string): mimeType is AllowedMimeType =>
  (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);

export const MAX_ORIGINAL_NAME_LENGTH = 255;

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 10,
  maxLimit: 100,
} as const;

export const RECENT_FILES_LIMIT = 5;
