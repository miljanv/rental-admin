import { Router } from 'express';

import * as adminController from '../controllers/admin.controller';
import { validateRequest } from '../middleware/validate-request';
import { listAuditEventsQuerySchema } from '../schemas/audit.schema';
import { asyncHandler } from '../utils/async-handler';

export const adminRouter = Router();

adminRouter.get('/summary', asyncHandler(adminController.getSummary));

adminRouter.get(
  '/audit-events',
  validateRequest({ query: listAuditEventsQuerySchema }),
  asyncHandler(adminController.listAuditEvents),
);

adminRouter.get(
  '/finance-audit-events',
  validateRequest({ query: listAuditEventsQuerySchema }),
  asyncHandler(adminController.listFinanceAuditEvents),
);
