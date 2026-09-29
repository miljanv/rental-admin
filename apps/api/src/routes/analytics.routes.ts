import { Router } from 'express';

import * as analyticsController from '../controllers/analytics.controller';
import { validateRequest } from '../middleware/validate-request';
import { businessAnalyticsQuerySchema } from '../schemas/analytics.schema';
import { asyncHandler } from '../utils/async-handler';

export const analyticsRouter = Router();

analyticsRouter.get(
  '/business',
  validateRequest({ query: businessAnalyticsQuerySchema }),
  asyncHandler(analyticsController.getBusinessAnalytics),
);
