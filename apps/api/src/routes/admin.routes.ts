import { Router } from 'express';

import * as adminController from '../controllers/admin.controller';
import { asyncHandler } from '../utils/async-handler';

export const adminRouter = Router();

adminRouter.get('/summary', asyncHandler(adminController.getSummary));
