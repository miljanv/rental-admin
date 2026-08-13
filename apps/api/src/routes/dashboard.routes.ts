import { Router } from 'express';

import * as dashboardController from '../controllers/dashboard.controller';
import { asyncHandler } from '../utils/async-handler';

export const dashboardRouter = Router();

dashboardRouter.get('/stats', asyncHandler(dashboardController.getStats));
