import { Router } from 'express';
import {
  counterpartySchema,
  openingBalanceWriteSchema,
  openingBalanceConfirmSchema,
  financeIdParamsSchema,
  financeReasonSchema,
} from '@rental-admin/shared';
import * as controller from '../controllers/finance-settlement.controller';
import { validateRequest } from '../middleware/validate-request';
import { asyncHandler } from '../utils/async-handler';
export const openingBalanceRouter = Router();
openingBalanceRouter.get(
  '/',
  validateRequest({ query: counterpartySchema }),
  asyncHandler(controller.listOpeningBalances),
);
openingBalanceRouter.post(
  '/',
  validateRequest({ body: openingBalanceWriteSchema }),
  asyncHandler(controller.createOpeningBalance),
);
openingBalanceRouter.patch(
  '/:id',
  validateRequest({ params: financeIdParamsSchema, body: openingBalanceWriteSchema }),
  asyncHandler(controller.updateOpeningBalance),
);
openingBalanceRouter.post(
  '/:id/confirm',
  validateRequest({ params: financeIdParamsSchema, body: openingBalanceConfirmSchema }),
  asyncHandler(controller.confirmOpeningBalance),
);
openingBalanceRouter.post(
  '/:id/reverse',
  validateRequest({ params: financeIdParamsSchema, body: financeReasonSchema }),
  asyncHandler(controller.reverseOpeningBalance),
);
