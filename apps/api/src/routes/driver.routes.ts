import { Router } from 'express';

import * as driverController from '../controllers/driver.controller';
import { validateRequest } from '../middleware/validate-request';
import {
  driverIdParamsSchema,
  driverWriteSchema,
  listDriversQuerySchema,
} from '../schemas/driver.schema';
import { asyncHandler } from '../utils/async-handler';

export const driverRouter = Router();

driverRouter.get(
  '/',
  validateRequest({ query: listDriversQuerySchema }),
  asyncHandler(driverController.listDrivers),
);

driverRouter.post(
  '/',
  validateRequest({ body: driverWriteSchema }),
  asyncHandler(driverController.createDriver),
);

driverRouter.get(
  '/:id',
  validateRequest({ params: driverIdParamsSchema }),
  asyncHandler(driverController.getDriver),
);

driverRouter.patch(
  '/:id',
  validateRequest({ params: driverIdParamsSchema, body: driverWriteSchema }),
  asyncHandler(driverController.updateDriver),
);

driverRouter.delete(
  '/:id',
  validateRequest({ params: driverIdParamsSchema }),
  asyncHandler(driverController.deleteDriver),
);
