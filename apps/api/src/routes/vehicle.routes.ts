import { Router } from 'express';

import * as vehicleController from '../controllers/vehicle.controller';
import { validateRequest } from '../middleware/validate-request';
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
