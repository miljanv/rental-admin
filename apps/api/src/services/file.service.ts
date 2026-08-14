import {
  isAllowedMimeType,
  type DeleteFileResult,
  type DownloadUrlResult,
  type FileObjectDto,
  type FileSortField,
  type ListFilesQuery,
  type PaginationMeta,
  type PresignUploadRequest,
  type PresignUploadResult,
  type PreviewUrlResult,
  type SortOrder,
} from '@rental-admin/shared';

import { env } from '../config/env';
import { prisma } from '../config/prisma';
import {
  notFound,
  payloadTooLarge,
  unsupportedMediaType,
  uploadNotCompleted,
} from '../utils/app-error';
import { buildPaginationMeta } from '../utils/api-response';
import { toFileObjectDto, type FileObjectRecord } from '../utils/file-mapper';
import { logger } from '../utils/logger';
import { buildStorageKey, sanitizeFileName } from '../utils/storage-key';
import * as storage from './storage.service';

type FileOrderBy = Partial<Record<FileSortField, SortOrder>>;

const markFailed = async (id: string): Promise<void> => {
  await prisma.fileObject.update({ where: { id }, data: { status: 'FAILED' } });
};

/**
 * Step 1-6 of the upload flow: validate, allocate a unique storage key, create
 * the PENDING row and hand back a short lived presigned PUT URL. The file itself
 * never passes through this server.
 */
export const createPresignedUpload = async (
  input: PresignUploadRequest,
): Promise<PresignUploadResult> => {
  if (input.size > env.maxFileSizeBytes) {
    throw payloadTooLarge(
      `File is larger than the ${env.MAX_FILE_SIZE_MB} MB limit configured for this environment.`,
    );
  }

  const storageKey = buildStorageKey(input.originalName);

  const record = await prisma.fileObject.create({
    data: {
      originalName: input.originalName,
      storageKey,
      mimeType: input.mimeType,
      size: input.size,
      status: 'PENDING',
    },
  });

  try {
    const { uploadUrl, expiresIn } = await storage.createUploadUrl({
      storageKey,
      mimeType: input.mimeType,
    });

    return { fileId: record.id, storageKey, uploadUrl, expiresIn };
  } catch (error) {
    // Never leave a row behind for an upload the client cannot even start.
    await prisma.fileObject.delete({ where: { id: record.id } }).catch(() => undefined);
    throw error;
  }
};

/**
 * Step 9-11: the client reports that the direct S3 upload finished, and the API
 * verifies the object really exists before the row becomes UPLOADED. Anything
 * that cannot be verified is marked FAILED, so it never shows up as a
 * successful upload.
 */
export const confirmUpload = async (id: string): Promise<FileObjectDto> => {
  const record = await prisma.fileObject.findUnique({ where: { id } });

  if (!record) {
    throw notFound('File not found.');
  }

  if (record.status === 'UPLOADED') {
    return toFileObjectDto(record);
  }

  const metadata = await storage.getObjectMetadata(record.storageKey);

  if (!metadata) {
    await markFailed(record.id);
    throw uploadNotCompleted('The upload did not reach storage. Please try again.');
  }

  if (metadata.size > env.maxFileSizeBytes) {
    await storage.deleteObject(record.storageKey);
    await markFailed(record.id);
    throw payloadTooLarge(
      `The uploaded file exceeds the ${env.MAX_FILE_SIZE_MB} MB limit and was discarded.`,
    );
  }

  if (metadata.mimeType && !isAllowedMimeType(metadata.mimeType)) {
    await storage.deleteObject(record.storageKey);
    await markFailed(record.id);
    throw unsupportedMediaType('The uploaded file type is not supported and was discarded.');
  }

  const confirmed = await prisma.fileObject.update({
    where: { id: record.id },
    data: {
      status: 'UPLOADED',
      uploadedAt: new Date(),
      // Trust the object in the bucket over the size the client announced.
      size: metadata.size,
    },
  });

  logger.info('Upload confirmed', { fileId: confirmed.id, size: confirmed.size });

  return toFileObjectDto(confirmed);
};

export const listFiles = async (
  query: ListFilesQuery,
): Promise<{ files: FileObjectDto[]; pagination: PaginationMeta }> => {
  const orderBy: FileOrderBy = { [query.sortBy]: query.sortOrder };

  const where = {
    // Only confirmed uploads are listed unless a status is explicitly requested.
    status: query.status ?? ('UPLOADED' as const),
    // Matched against the original name and against the sanitized storage key,
    // so both "Đorđević" and "dordevic" find a file uploaded as "Đorđević.pdf".
    ...(query.search
      ? {
          OR: [
            { originalName: { contains: query.search, mode: 'insensitive' as const } },
            {
              storageKey: {
                contains: sanitizeFileName(query.search),
                mode: 'insensitive' as const,
              },
            },
          ],
        }
      : {}),
  };

  const [total, records] = await Promise.all([
    prisma.fileObject.count({ where }),
    prisma.fileObject.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    files: records.map((record: FileObjectRecord) => toFileObjectDto(record)),
    pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
  };
};

/**
 * Issues a presigned GET URL, but only after confirming the object still exists.
 * A row whose object has disappeared is marked FAILED instead of handing out a
 * URL that would return an S3 error page.
 */
const createSignedGetUrl = async (
  id: string,
  disposition: 'attachment' | 'inline',
): Promise<{ url: string; fileName: string; expiresIn: number }> => {
  const record = await prisma.fileObject.findUnique({ where: { id } });

  if (!record) {
    throw notFound('File not found.');
  }

  if (record.status !== 'UPLOADED') {
    throw uploadNotCompleted('This file has no completed upload to download.');
  }

  const metadata = await storage.getObjectMetadata(record.storageKey);

  if (!metadata) {
    await markFailed(record.id);
    logger.warn('Database row without a storage object', {
      fileId: record.id,
      storageKey: record.storageKey,
    });
    throw notFound('This file is no longer available in storage.');
  }

  const { downloadUrl, expiresIn } = await storage.createDownloadUrl({
    storageKey: record.storageKey,
    fileName: record.originalName,
    mimeType: record.mimeType,
    disposition,
  });

  return { url: downloadUrl, fileName: record.originalName, expiresIn };
};

export const createDownloadUrl = async (id: string): Promise<DownloadUrlResult> => {
  const signed = await createSignedGetUrl(id, 'attachment');

  return { downloadUrl: signed.url, fileName: signed.fileName, expiresIn: signed.expiresIn };
};

export const createPreviewUrl = async (id: string): Promise<PreviewUrlResult> => {
  const signed = await createSignedGetUrl(id, 'inline');

  return { previewUrl: signed.url, fileName: signed.fileName, expiresIn: signed.expiresIn };
};

/**
 * Deletes the S3 object first and the row only after storage confirms. If the
 * object is already gone the row is still removed, so the database cannot keep
 * pointing at something that does not exist.
 */
export const deleteFile = async (id: string): Promise<DeleteFileResult> => {
  const record = await prisma.fileObject.findUnique({ where: { id } });

  if (!record) {
    throw notFound('File not found.');
  }

  await storage.deleteObject(record.storageKey);
  await prisma.fileObject.delete({ where: { id: record.id } });

  logger.info('File deleted', { fileId: record.id, storageKey: record.storageKey });

  return { id: record.id, deleted: true };
};
