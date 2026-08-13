import { Router } from 'express';

import * as fileController from '../controllers/file.controller';
import { uploadRateLimiter } from '../middleware/rate-limit';
import { validateRequest } from '../middleware/validate-request';
import {
  fileIdParamsSchema,
  listFilesQuerySchema,
  presignUploadBodySchema,
} from '../schemas/file.schema';
import { asyncHandler } from '../utils/async-handler';

export const fileRouter = Router();

fileRouter.get(
  '/',
  validateRequest({ query: listFilesQuerySchema }),
  asyncHandler(fileController.listFiles),
);

fileRouter.post(
  '/presign-upload',
  uploadRateLimiter,
  validateRequest({ body: presignUploadBodySchema }),
  asyncHandler(fileController.presignUpload),
);

fileRouter.post(
  '/:id/confirm',
  uploadRateLimiter,
  validateRequest({ params: fileIdParamsSchema }),
  asyncHandler(fileController.confirmUpload),
);

fileRouter.get(
  '/:id/download',
  validateRequest({ params: fileIdParamsSchema }),
  asyncHandler(fileController.getDownloadUrl),
);

fileRouter.delete(
  '/:id',
  uploadRateLimiter,
  validateRequest({ params: fileIdParamsSchema }),
  asyncHandler(fileController.deleteFile),
);
