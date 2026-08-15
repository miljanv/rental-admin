import { Router } from 'express';

import * as partnerController from '../controllers/partner.controller';
import { validateRequest } from '../middleware/validate-request';
import {
  listPartnersQuerySchema,
  partnerIdParamsSchema,
  partnerWriteSchema,
} from '../schemas/partner.schema';
import { asyncHandler } from '../utils/async-handler';

export const partnerRouter = Router();

partnerRouter.get(
  '/',
  validateRequest({ query: listPartnersQuerySchema }),
  asyncHandler(partnerController.listPartners),
);

partnerRouter.post(
  '/',
  validateRequest({ body: partnerWriteSchema }),
  asyncHandler(partnerController.createPartner),
);

partnerRouter.get(
  '/:id',
  validateRequest({ params: partnerIdParamsSchema }),
  asyncHandler(partnerController.getPartner),
);

partnerRouter.patch(
  '/:id',
  validateRequest({ params: partnerIdParamsSchema, body: partnerWriteSchema }),
  asyncHandler(partnerController.updatePartner),
);

partnerRouter.delete(
  '/:id',
  validateRequest({ params: partnerIdParamsSchema }),
  asyncHandler(partnerController.deletePartner),
);
