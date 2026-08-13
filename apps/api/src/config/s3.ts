import { S3Client } from '@aws-sdk/client-s3';

import { env } from './env';

/**
 * Single S3 client for the process. Credentials stay on the server: the browser
 * only ever receives presigned URLs.
 *
 * `AWS_S3_ENDPOINT` is optional and only intended for S3-compatible services
 * (MinIO, LocalStack) during local testing. Production uses the real AWS
 * endpoint derived from the region.
 */
const createS3Client = (): S3Client =>
  new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
    /**
     * Required for presigned PUT URLs. With the SDK default
     * (`WHEN_SUPPORTED`) the signer adds an `x-amz-checksum-crc32` query
     * parameter computed over an empty body, and S3 then rejects the browser's
     * upload because the real body does not match that checksum.
     */
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    ...(env.AWS_S3_ENDPOINT ? { endpoint: env.AWS_S3_ENDPOINT } : {}),
    ...(env.AWS_S3_FORCE_PATH_STYLE ? { forcePathStyle: true } : {}),
  });

declare global {
  var __s3Client: S3Client | undefined;
}

export const s3Client: S3Client = globalThis.__s3Client ?? createS3Client();

if (!env.isProduction) {
  globalThis.__s3Client = s3Client;
}

export const S3_BUCKET_NAME = env.AWS_S3_BUCKET_NAME;

export const destroyS3Client = (): void => {
  s3Client.destroy();
};
