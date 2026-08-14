import type { DriverIdParams, DriverWriteRequest, ListDriversQuery } from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as driverService from '../services/driver.service';
import { sendPaginated, sendSuccess } from '../utils/api-response';

export const listDrivers = async (req: Request, res: Response): Promise<void> => {
  const query = validated<ListDriversQuery>(req, 'query');
  const { drivers, pagination } = await driverService.listDrivers(query);

  sendPaginated(res, drivers, pagination);
};

export const getDriver = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<DriverIdParams>(req, 'params');
  const driver = await driverService.getDriver(id);

  sendSuccess(res, driver);
};

export const createDriver = async (req: Request, res: Response): Promise<void> => {
  const body = validated<DriverWriteRequest>(req, 'body');
  const driver = await driverService.createDriver(body);

  sendSuccess(res, driver, 201);
};

export const updateDriver = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<DriverIdParams>(req, 'params');
  const body = validated<DriverWriteRequest>(req, 'body');
  const driver = await driverService.updateDriver(id, body);

  sendSuccess(res, driver);
};

export const deleteDriver = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<DriverIdParams>(req, 'params');
  const result = await driverService.deleteDriver(id);

  sendSuccess(res, result);
};
