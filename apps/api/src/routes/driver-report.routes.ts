import {
  acceptDriverReportSchema,
  driverReportParamsSchema,
  listDriverReportsQuerySchema,
  returnDriverReportSchema,
} from '@rental-admin/shared';
import { Router } from 'express';

import * as driverReportController from '../controllers/driver-report.controller';
import { validateRequest } from '../middleware/validate-request';
import { asyncHandler } from '../utils/async-handler';

/** What drivers sent from the driver portal, for the office to review. */
export const driverReportRouter = Router();

driverReportRouter.get(
  '/',
  validateRequest({ query: listDriverReportsQuerySchema }),
  asyncHandler(driverReportController.listDriverReports),
);

driverReportRouter.get(
  '/pending-count',
  asyncHandler(driverReportController.countPendingDriverReports),
);

driverReportRouter.get('/missing', asyncHandler(driverReportController.listMissingDriverReports));

driverReportRouter.get(
  '/:id',
  validateRequest({ params: driverReportParamsSchema }),
  asyncHandler(driverReportController.getDriverReport),
);

driverReportRouter.post(
  '/:id/accept',
  validateRequest({ params: driverReportParamsSchema, body: acceptDriverReportSchema }),
  asyncHandler(driverReportController.acceptDriverReport),
);

driverReportRouter.post(
  '/:id/return',
  validateRequest({ params: driverReportParamsSchema, body: returnDriverReportSchema }),
  asyncHandler(driverReportController.returnDriverReport),
);
