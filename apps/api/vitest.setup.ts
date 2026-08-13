/**
 * Deterministic environment for unit tests. AWS and the database are never
 * contacted: these values only need to satisfy the Zod environment schema that
 * runs when `src/config/env.ts` is imported.
 */
process.env.NODE_ENV = 'test';
process.env.PORT = '4000';
process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/file_admin_test';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.AWS_REGION = 'eu-central-1';
process.env.AWS_S3_BUCKET_NAME = 'test-bucket';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.PRESIGNED_UPLOAD_EXPIRES_IN = '300';
process.env.PRESIGNED_DOWNLOAD_EXPIRES_IN = '300';
process.env.MAX_FILE_SIZE_MB = '25';
