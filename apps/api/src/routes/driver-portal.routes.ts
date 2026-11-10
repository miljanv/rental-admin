import { driverPortalTripParamsSchema, driverReportWriteSchema } from '@rental-admin/shared';
import { Router } from 'express';

import * as driverPortalController from '../controllers/driver-portal.controller';
import { uploadRateLimiter } from '../middleware/rate-limit';
import { validateRequest } from '../middleware/validate-request';
import { fileIdParamsSchema, presignUploadBodySchema } from '../schemas/file.schema';
import { asyncHandler } from '../utils/async-handler';

/** Mounted behind `requireDriverToken`: every route acts for the driver of the link. */
export const driverPortalRouter = Router();

driverPortalRouter.get('/me', asyncHandler(driverPortalController.getMe));

driverPortalRouter.get('/trips', asyncHandler(driverPortalController.listTrips));

driverPortalRouter.get(
  '/trips/:id',
  validateRequest({ params: driverPortalTripParamsSchema }),
  asyncHandler(driverPortalController.getTrip),
);

driverPortalRouter.put(
  '/trips/:id/report',
  validateRequest({ params: driverPortalTripParamsSchema, body: driverReportWriteSchema }),
  asyncHandler(driverPortalController.submitReport),
);

driverPortalRouter.post(
  '/uploads/presign',
  uploadRateLimiter,
  validateRequest({ body: presignUploadBodySchema }),
  asyncHandler(driverPortalController.presignReceipt),
);

driverPortalRouter.post(
  '/uploads/:id/confirm',
  uploadRateLimiter,
  validateRequest({ params: fileIdParamsSchema }),
  asyncHandler(driverPortalController.confirmReceipt),
);
