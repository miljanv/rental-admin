import type { AlarmThresholdsWriteRequest } from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as alarmService from '../services/alarm.service';
import { sendSuccess } from '../utils/api-response';

export const listAlarms = async (_req: Request, res: Response): Promise<void> => {
  const alarms = await alarmService.listAlarms();

  sendSuccess(res, alarms);
};

export const getAlarmThresholds = async (_req: Request, res: Response): Promise<void> => {
  const thresholds = await alarmService.getAlarmThresholds();

  sendSuccess(res, thresholds);
};

export const updateAlarmThresholds = async (req: Request, res: Response): Promise<void> => {
  const body = validated<AlarmThresholdsWriteRequest>(req, 'body');
  const thresholds = await alarmService.updateAlarmThresholds(body);

  sendSuccess(res, thresholds);
};
