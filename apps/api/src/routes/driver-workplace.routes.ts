import {
  driverFuelEntryListQuerySchema,
  driverFuelEntryParamsSchema,
  driverFuelEntryReviewSchema,
  vehicleFaultListQuerySchema,
  vehicleFaultParamsSchema,
  vehicleFaultUpdateSchema,
} from '@rental-admin/shared';
import { Router } from 'express';

import * as workplaceController from '../controllers/driver-workplace.controller';
import { validateRequest } from '../middleware/validate-request';
import { asyncHandler } from '../utils/async-handler';

/** Faults and free diesel entries drivers send from the portal, for the office. */
export const driverWorkplaceRouter = Router();

driverWorkplaceRouter.get(
  '/pending-count',
  asyncHandler(workplaceController.countWorkplacePending),
);

driverWorkplaceRouter.get('/tools', asyncHandler(workplaceController.listToolsNeedingOffice));

driverWorkplaceRouter.get(
  '/faults',
  validateRequest({ query: vehicleFaultListQuerySchema }),
  asyncHandler(workplaceController.listVehicleFaults),
);

driverWorkplaceRouter.patch(
  '/faults/:id',
  validateRequest({ params: vehicleFaultParamsSchema, body: vehicleFaultUpdateSchema }),
  asyncHandler(workplaceController.updateVehicleFault),
);

driverWorkplaceRouter.get(
  '/fuel-entries',
  validateRequest({ query: driverFuelEntryListQuerySchema }),
  asyncHandler(workplaceController.listDriverFuelEntries),
);

driverWorkplaceRouter.post(
  '/fuel-entries/:id/review',
  validateRequest({ params: driverFuelEntryParamsSchema, body: driverFuelEntryReviewSchema }),
  asyncHandler(workplaceController.reviewDriverFuelEntry),
);
