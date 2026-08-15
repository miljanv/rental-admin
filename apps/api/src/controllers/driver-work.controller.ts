import type { DriverIdParams, ListDriverWorkRecordsQuery } from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as driverWorkService from '../services/driver-work.service';
import { sendSuccess } from '../utils/api-response';

export const listDriverWorkRecords = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<DriverIdParams>(req, 'params');
  const query = validated<ListDriverWorkRecordsQuery>(req, 'query');
  const records = await driverWorkService.getDriverWorkRecords(id, query);

  sendSuccess(res, records);
};
