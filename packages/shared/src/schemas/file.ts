import { z } from 'zod';

import {
  ALLOWED_MIME_TYPES,
  DEFAULT_MAX_FILE_SIZE_BYTES,
  MAX_ORIGINAL_NAME_LENGTH,
  PAGINATION_DEFAULTS,
} from '../constants';
import { FILE_STATUSES } from '../types/file';

export const fileStatusSchema = z.enum(FILE_STATUSES);

export const allowedMimeTypeSchema = z.enum(ALLOWED_MIME_TYPES, {
  error: 'This file type is not supported.',
});

export const fileIdSchema = z.string().trim().min(1).max(64);

export const fileIdParamsSchema = z.object({ id: fileIdSchema });

export type FileIdParams = z.infer<typeof fileIdParamsSchema>;

const formatMegabytes = (bytes: number): string => {
  const megabytes = bytes / (1024 * 1024);
  return Number.isInteger(megabytes) ? `${megabytes} MB` : `${megabytes.toFixed(1)} MB`;
};

/**
 * The maximum upload size is configurable per environment, so the schema is
 * produced by a factory. Both the API (from MAX_FILE_SIZE_MB) and the web app
 * build their own instance from the same definition.
 */
export const createPresignUploadRequestSchema = (maxFileSizeBytes: number) =>
  z.object({
    originalName: z
      .string()
      .trim()
      .min(1, 'File name is required.')
      .max(
        MAX_ORIGINAL_NAME_LENGTH,
        `File name must be at most ${MAX_ORIGINAL_NAME_LENGTH} characters.`,
      ),
    mimeType: allowedMimeTypeSchema,
    size: z
      .number()
      .int('File size must be a whole number of bytes.')
      .positive('File must not be empty.')
      .max(maxFileSizeBytes, `File is larger than the ${formatMegabytes(maxFileSizeBytes)} limit.`),
  });

export const presignUploadRequestSchema = createPresignUploadRequestSchema(
  DEFAULT_MAX_FILE_SIZE_BYTES,
);

export type PresignUploadRequest = z.infer<typeof presignUploadRequestSchema>;

export const FILE_SORT_FIELDS = ['createdAt', 'originalName', 'size', 'uploadedAt'] as const;

export type FileSortField = (typeof FILE_SORT_FIELDS)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;

export type SortOrder = (typeof SORT_ORDERS)[number];

export const listFilesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION_DEFAULTS.page),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION_DEFAULTS.maxLimit)
    .default(PAGINATION_DEFAULTS.limit),
  search: z
    .string()
    .trim()
    .max(MAX_ORIGINAL_NAME_LENGTH)
    .optional()
    .transform((value) => (value ? value : undefined)),
  sortBy: z.enum(FILE_SORT_FIELDS).default('createdAt'),
  sortOrder: z.enum(SORT_ORDERS).default('desc'),
  status: fileStatusSchema.optional(),
});

export type ListFilesQuery = z.output<typeof listFilesQuerySchema>;
export type ListFilesQueryInput = z.input<typeof listFilesQuerySchema>;
