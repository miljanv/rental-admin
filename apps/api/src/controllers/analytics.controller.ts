import type { BusinessAnalyticsQueryRequest } from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as analyticsService from '../services/analytics.service';
import { sendSuccess } from '../utils/api-response';

export const getBusinessAnalytics = async (req: Request, res: Response): Promise<void> => {
  const query = validated<BusinessAnalyticsQueryRequest>(req, 'query');
  const report = await analyticsService.getBusinessAnalytics(query);

  sendSuccess(res, report);
};
