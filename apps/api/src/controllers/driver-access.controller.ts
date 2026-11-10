import type { DriverIdParams } from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as driverAccessService from '../services/driver-access.service';
import { sendSuccess } from '../utils/api-response';

export const getDriverAccessLink = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<DriverIdParams>(req, 'params');

  sendSuccess(res, await driverAccessService.getDriverAccessLink(id));
};

export const createDriverAccessLink = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<DriverIdParams>(req, 'params');

  sendSuccess(res, await driverAccessService.createDriverAccessLink(id), 201);
};

export const revokeDriverAccessLink = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<DriverIdParams>(req, 'params');

  sendSuccess(res, await driverAccessService.revokeDriverAccessLink(id));
};
