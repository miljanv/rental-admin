import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { env } from '../config/env';
import { S3_BUCKET_NAME, s3Client } from '../config/s3';
import { storageError } from '../utils/app-error';
import { logger } from '../utils/logger';
import { buildContentDisposition } from '../utils/storage-key';

export interface StoredObjectMetadata {
  size: number;
  mimeType: string | undefined;
}

const NOT_FOUND_STATUS = 404;

const getHttpStatus = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null || !('$metadata' in error)) {
    return undefined;
  }

  const metadata = (error as { $metadata: unknown }).$metadata;

  if (typeof metadata !== 'object' || metadata === null || !('httpStatusCode' in metadata)) {
    return undefined;
  }

  const status = (metadata as { httpStatusCode: unknown }).httpStatusCode;

  return typeof status === 'number' ? status : undefined;
};

const isNotFound = (error: unknown): boolean => {
  if (getHttpStatus(error) === NOT_FOUND_STATUS) {
    return true;
  }

  return error instanceof Error && (error.name === 'NotFound' || error.name === 'NoSuchKey');
};

const toStorageError = (operation: string, storageKey: string, error: unknown) => {
  logger.error(`S3 ${operation} failed`, error, { storageKey, bucket: S3_BUCKET_NAME });

  return storageError('Storage is temporarily unavailable. Please try again.', {
    cause: error,
    logContext: { operation, storageKey },
  });
};

/**
 * Presigned PUT URL. The signed `Content-Type` binds the upload to the MIME type
 * the API validated, and the URL expires within minutes. The bucket itself stays
 * private: this URL is the only way a browser can write an object.
 */
export const createUploadUrl = async (params: {
  storageKey: string;
  mimeType: string;
}): Promise<{ uploadUrl: string; expiresIn: number }> => {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: params.storageKey,
    ContentType: params.mimeType,
  });

  try {
    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: env.PRESIGNED_UPLOAD_EXPIRES_IN,
    });

    return { uploadUrl, expiresIn: env.PRESIGNED_UPLOAD_EXPIRES_IN };
  } catch (error) {
    throw toStorageError('presign-upload', params.storageKey, error);
  }
};

/**
 * Presigned GET URL that forces a download with the original file name.
 */
export const createDownloadUrl = async (params: {
  storageKey: string;
  fileName: string;
  mimeType: string;
}): Promise<{ downloadUrl: string; expiresIn: number }> => {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: params.storageKey,
    ResponseContentType: params.mimeType,
    ResponseContentDisposition: buildContentDisposition(params.fileName),
  });

  try {
    const downloadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: env.PRESIGNED_DOWNLOAD_EXPIRES_IN,
    });

    return { downloadUrl, expiresIn: env.PRESIGNED_DOWNLOAD_EXPIRES_IN };
  } catch (error) {
    throw toStorageError('presign-download', params.storageKey, error);
  }
};

/**
 * Returns the object metadata, or `null` when the object does not exist.
 * Used to prove an upload really landed in the bucket before it is marked as
 * uploaded, and to detect database rows whose object has disappeared.
 */
export const getObjectMetadata = async (
  storageKey: string,
): Promise<StoredObjectMetadata | null> => {
  try {
    const result = await s3Client.send(
      new HeadObjectCommand({ Bucket: S3_BUCKET_NAME, Key: storageKey }),
    );

    return {
      size: result.ContentLength ?? 0,
      mimeType: result.ContentType,
    };
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }

    throw toStorageError('head-object', storageKey, error);
  }
};

/**
 * Deletes the object. A missing object is treated as success so a half-finished
 * upload can always be cleaned up.
 */
export const deleteObject = async (storageKey: string): Promise<void> => {
  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET_NAME, Key: storageKey }));
  } catch (error) {
    if (isNotFound(error)) {
      logger.warn('S3 object was already gone when deleting', { storageKey });
      return;
    }

    throw toStorageError('delete-object', storageKey, error);
  }
};
