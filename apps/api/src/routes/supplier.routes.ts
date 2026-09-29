import { Router } from 'express';

import * as supplierController from '../controllers/supplier.controller';
import { validateRequest } from '../middleware/validate-request';
import {
  listSuppliersQuerySchema,
  supplierIdParamsSchema,
  supplierWriteSchema,
} from '../schemas/supplier.schema';
import { asyncHandler } from '../utils/async-handler';

export const supplierRouter = Router();

supplierRouter.get(
  '/',
  validateRequest({ query: listSuppliersQuerySchema }),
  asyncHandler(supplierController.listSuppliers),
);

supplierRouter.post(
  '/',
  validateRequest({ body: supplierWriteSchema }),
  asyncHandler(supplierController.createSupplier),
);

supplierRouter.get(
  '/:id',
  validateRequest({ params: supplierIdParamsSchema }),
  asyncHandler(supplierController.getSupplier),
);

supplierRouter.patch(
  '/:id',
  validateRequest({ params: supplierIdParamsSchema, body: supplierWriteSchema }),
  asyncHandler(supplierController.updateSupplier),
);

supplierRouter.delete(
  '/:id',
  validateRequest({ params: supplierIdParamsSchema }),
  asyncHandler(supplierController.deleteSupplier),
);
