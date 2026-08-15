import { Router } from 'express';

import * as alarmController from '../controllers/alarm.controller';
import { validateRequest } from '../middleware/validate-request';
import { alarmThresholdsWriteSchema } from '../schemas/alarm.schema';
import { asyncHandler } from '../utils/async-handler';

export const alarmRouter = Router();

alarmRouter.get('/', asyncHandler(alarmController.listAlarms));

alarmRouter.get('/thresholds', asyncHandler(alarmController.getAlarmThresholds));

alarmRouter.patch(
  '/thresholds',
  validateRequest({ body: alarmThresholdsWriteSchema }),
  asyncHandler(alarmController.updateAlarmThresholds),
);
