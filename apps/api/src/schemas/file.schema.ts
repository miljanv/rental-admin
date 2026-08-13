import {
  createPresignUploadRequestSchema,
  fileIdParamsSchema,
  listFilesQuerySchema,
} from '@rental-admin/shared';

import { env } from '../config/env';

/**
 * The shared schema is instantiated with this environment's size limit, so the
 * API never accepts a file larger than MAX_FILE_SIZE_MB even if the browser does.
 */
export const presignUploadBodySchema = createPresignUploadRequestSchema(env.maxFileSizeBytes);

export { fileIdParamsSchema, listFilesQuerySchema };
