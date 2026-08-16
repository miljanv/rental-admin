import { Router } from 'express';

import * as fuelLogController from '../controllers/fuel-log.controller';
import { validateRequest } from '../middleware/validate-request';
import {
  fuelConsumptionQuerySchema,
  fuelLogBulkWriteSchema,
  fuelLogCreateSchema,
  fuelLogIdParamsSchema,
  listFuelLogsQuerySchema,
} from '../schemas/fuel-log.schema';
import { asyncHandler } from '../utils/async-handler';

export const fuelLogRouter = Router();

fuelLogRouter.get(
  '/',
  validateRequest({ query: listFuelLogsQuerySchema }),
  asyncHandler(fuelLogController.listFuelLogs),
);

fuelLogRouter.post(
  '/',
  validateRequest({ body: fuelLogCreateSchema }),
  asyncHandler(fuelLogController.createFuelLog),
);

fuelLogRouter.post(
  '/bulk',
  validateRequest({ body: fuelLogBulkWriteSchema }),
  asyncHandler(fuelLogController.createFuelLogsBulk),
);

fuelLogRouter.get('/suppliers', asyncHandler(fuelLogController.listFuelSuppliers));

fuelLogRouter.get(
  '/consumption',
  validateRequest({ query: fuelConsumptionQuerySchema }),
  asyncHandler(fuelLogController.getFuelConsumption),
);

fuelLogRouter.get(
  '/:id',
  validateRequest({ params: fuelLogIdParamsSchema }),
  asyncHandler(fuelLogController.getFuelLog),
);

fuelLogRouter.patch(
  '/:id',
  validateRequest({ params: fuelLogIdParamsSchema, body: fuelLogCreateSchema }),
  asyncHandler(fuelLogController.updateFuelLog),
);

fuelLogRouter.delete(
  '/:id',
  validateRequest({ params: fuelLogIdParamsSchema }),
  asyncHandler(fuelLogController.deleteFuelLog),
);
