import { Router } from 'express';

import * as vehicleInspectionController from '../controllers/vehicle-inspection.controller';
import * as vehicleController from '../controllers/vehicle.controller';
import { validateRequest } from '../middleware/validate-request';
import {
  expiringInspectionsQuerySchema,
  vehicleInspectionParamsSchema,
  vehicleInspectionWriteSchema,
} from '../schemas/vehicle-inspection.schema';
import {
  listVehiclesQuerySchema,
  vehicleIdParamsSchema,
  vehicleWriteSchema,
} from '../schemas/vehicle.schema';
import { asyncHandler } from '../utils/async-handler';

export const vehicleRouter = Router();

vehicleRouter.get(
  '/',
  validateRequest({ query: listVehiclesQuerySchema }),
  asyncHandler(vehicleController.listVehicles),
);

vehicleRouter.post(
  '/',
  validateRequest({ body: vehicleWriteSchema }),
  asyncHandler(vehicleController.createVehicle),
);

// Static/collection routes MUST be declared before the `/:id` routes to avoid
// "expiring-inspections" being captured as an :id param.
vehicleRouter.get(
  '/expiring-inspections',
  validateRequest({ query: expiringInspectionsQuerySchema }),
  asyncHandler(vehicleInspectionController.listExpiringInspections),
);

vehicleRouter.get(
  '/:id/inspections',
  validateRequest({ params: vehicleIdParamsSchema }),
  asyncHandler(vehicleInspectionController.listVehicleInspections),
);

vehicleRouter.post(
  '/:id/inspections',
  validateRequest({ params: vehicleIdParamsSchema, body: vehicleInspectionWriteSchema }),
  asyncHandler(vehicleInspectionController.createVehicleInspection),
);

vehicleRouter.get(
  '/:id/inspections/:inspectionId',
  validateRequest({ params: vehicleInspectionParamsSchema }),
  asyncHandler(vehicleInspectionController.getVehicleInspection),
);

vehicleRouter.patch(
  '/:id/inspections/:inspectionId',
  validateRequest({ params: vehicleInspectionParamsSchema, body: vehicleInspectionWriteSchema }),
  asyncHandler(vehicleInspectionController.updateVehicleInspection),
);

vehicleRouter.delete(
  '/:id/inspections/:inspectionId',
  validateRequest({ params: vehicleInspectionParamsSchema }),
  asyncHandler(vehicleInspectionController.deleteVehicleInspection),
);

vehicleRouter.get(
  '/:id',
  validateRequest({ params: vehicleIdParamsSchema }),
  asyncHandler(vehicleController.getVehicle),
);

vehicleRouter.patch(
  '/:id',
  validateRequest({ params: vehicleIdParamsSchema, body: vehicleWriteSchema }),
  asyncHandler(vehicleController.updateVehicle),
);

vehicleRouter.delete(
  '/:id',
  validateRequest({ params: vehicleIdParamsSchema }),
  asyncHandler(vehicleController.deleteVehicle),
);
