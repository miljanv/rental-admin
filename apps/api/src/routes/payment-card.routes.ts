import { paymentCardParamsSchema, paymentCardWriteSchema } from '@rental-admin/shared';
import { Router } from 'express';

import * as paymentCardController from '../controllers/payment-card.controller';
import { validateRequest } from '../middleware/validate-request';
import { asyncHandler } from '../utils/async-handler';

export const paymentCardRouter = Router();

paymentCardRouter.get('/', asyncHandler(paymentCardController.listPaymentCards));

paymentCardRouter.post(
  '/',
  validateRequest({ body: paymentCardWriteSchema }),
  asyncHandler(paymentCardController.createPaymentCard),
);

paymentCardRouter.patch(
  '/:id',
  validateRequest({ params: paymentCardParamsSchema, body: paymentCardWriteSchema }),
  asyncHandler(paymentCardController.updatePaymentCard),
);
