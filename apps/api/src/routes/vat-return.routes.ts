import { Router } from 'express';
import { vatReturnIdParamsSchema, vatReturnWriteSchema } from '@rental-admin/shared';

import * as controller from '../controllers/vat-return.controller';
import { validateRequest } from '../middleware/validate-request';
import { asyncHandler } from '../utils/async-handler';

export const vatReturnRouter = Router();

vatReturnRouter.post(
  '/',
  validateRequest({ body: vatReturnWriteSchema }),
  asyncHandler(controller.createVatReturn),
);
vatReturnRouter.patch(
  '/:id',
  validateRequest({ params: vatReturnIdParamsSchema, body: vatReturnWriteSchema }),
  asyncHandler(controller.updateVatReturn),
);
vatReturnRouter.delete(
  '/:id',
  validateRequest({ params: vatReturnIdParamsSchema }),
  asyncHandler(controller.deleteVatReturn),
);
