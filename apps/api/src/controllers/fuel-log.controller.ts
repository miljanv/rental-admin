import type {
  FuelLogParams,
  FuelLogWriteRequest,
  ListFuelLogsQuery,
  VehicleIdParams,
} from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as fuelLogService from '../services/fuel-log.service';
import { sendSuccess } from '../utils/api-response';

export const listFuelLogs = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<VehicleIdParams>(req, 'params');
  const query = validated<ListFuelLogsQuery>(req, 'query');
  const fuelLogs = await fuelLogService.listFuelLogs(id, query);

  sendSuccess(res, fuelLogs);
};

export const getFuelLog = async (req: Request, res: Response): Promise<void> => {
  const { id, fuelLogId } = validated<FuelLogParams>(req, 'params');
  const fuelLog = await fuelLogService.getFuelLog(id, fuelLogId);

  sendSuccess(res, fuelLog);
};

export const createFuelLog = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<VehicleIdParams>(req, 'params');
  const body = validated<FuelLogWriteRequest>(req, 'body');
  const fuelLog = await fuelLogService.createFuelLog(id, body);

  sendSuccess(res, fuelLog, 201);
};

export const updateFuelLog = async (req: Request, res: Response): Promise<void> => {
  const { id, fuelLogId } = validated<FuelLogParams>(req, 'params');
  const body = validated<FuelLogWriteRequest>(req, 'body');
  const fuelLog = await fuelLogService.updateFuelLog(id, fuelLogId, body);

  sendSuccess(res, fuelLog);
};

export const deleteFuelLog = async (req: Request, res: Response): Promise<void> => {
  const { id, fuelLogId } = validated<FuelLogParams>(req, 'params');
  const result = await fuelLogService.deleteFuelLog(id, fuelLogId);

  sendSuccess(res, result);
};
