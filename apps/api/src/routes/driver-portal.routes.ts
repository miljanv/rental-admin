import {
  driverFuelEntryCreateSchema,
  driverPortalToolCreateSchema,
  driverPortalToolParamsSchema,
  driverPortalTripParamsSchema,
  driverReportWriteSchema,
  driverToolLostSchema,
  driverToolRespondSchema,
  vehicleFaultCreateSchema,
} from '@rental-admin/shared';
import { Router } from 'express';

import * as driverPortalController from '../controllers/driver-portal.controller';
import * as workplaceController from '../controllers/driver-workplace.controller';
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
  '/trips/:id/confirm',
  validateRequest({ params: driverPortalTripParamsSchema }),
  asyncHandler(driverPortalController.confirmTrip),
);

driverPortalRouter.post(
  '/trips/:id/accept-advance',
  validateRequest({ params: driverPortalTripParamsSchema }),
  asyncHandler(driverPortalController.acceptAdvance),
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

driverPortalRouter.get('/vehicles', asyncHandler(workplaceController.listPortalVehicles));

driverPortalRouter.get('/faults', asyncHandler(workplaceController.listPortalFaults));

driverPortalRouter.post(
  '/faults',
  validateRequest({ body: vehicleFaultCreateSchema }),
  asyncHandler(workplaceController.reportPortalFault),
);

driverPortalRouter.get('/tools', asyncHandler(workplaceController.listPortalTools));

driverPortalRouter.post(
  '/tools',
  validateRequest({ body: driverPortalToolCreateSchema }),
  asyncHandler(workplaceController.addPortalTool),
);

driverPortalRouter.post(
  '/tools/confirm-all',
  asyncHandler(workplaceController.confirmAllPortalTools),
);

driverPortalRouter.post(
  '/tools/:toolId/respond',
  validateRequest({ params: driverPortalToolParamsSchema, body: driverToolRespondSchema }),
  asyncHandler(workplaceController.respondToPortalTool),
);

driverPortalRouter.post(
  '/tools/:toolId/lost',
  validateRequest({ params: driverPortalToolParamsSchema, body: driverToolLostSchema }),
  asyncHandler(workplaceController.reportPortalToolLost),
);

driverPortalRouter.get('/fuel-entries', asyncHandler(workplaceController.listPortalFuelEntries));

driverPortalRouter.post(
  '/fuel-entries',
  validateRequest({ body: driverFuelEntryCreateSchema }),
  asyncHandler(workplaceController.submitPortalFuelEntry),
);
