import type {
  FuelConsumptionQuery,
  FuelLogBulkWriteRequest,
  FuelLogCreateRequest,
  FuelLogIdParams,
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
  const query = validated<ListFuelLogsQuery>(req, 'query');
  const fuelLogs = await fuelLogService.listFuelLogs(query);

  sendSuccess(res, fuelLogs);
};

export const listVehicleFuelLogs = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<VehicleIdParams>(req, 'params');
  const query = validated<ListFuelLogsQuery>(req, 'query');
  const fuelLogs = await fuelLogService.listFuelLogs({ ...query, vehicleId: id });

  sendSuccess(res, fuelLogs);
};

export const getFuelLog = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<FuelLogIdParams>(req, 'params');
  const fuelLog = await fuelLogService.getFuelLog(id);

  sendSuccess(res, fuelLog);
};

export const getVehicleFuelLog = async (req: Request, res: Response): Promise<void> => {
  const { id, fuelLogId } = validated<FuelLogParams>(req, 'params');
  const fuelLog = await fuelLogService.getFuelLog(fuelLogId, id);

  sendSuccess(res, fuelLog);
};

export const createFuelLog = async (req: Request, res: Response): Promise<void> => {
  const body = validated<FuelLogCreateRequest>(req, 'body');
  const fuelLog = await fuelLogService.createFuelLog(body);

  sendSuccess(res, fuelLog, 201);
};

export const createVehicleFuelLog = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<VehicleIdParams>(req, 'params');
  const body = validated<FuelLogWriteRequest>(req, 'body');
  const fuelLog = await fuelLogService.createVehicleFuelLog(id, body);

  sendSuccess(res, fuelLog, 201);
};

export const createFuelLogsBulk = async (req: Request, res: Response): Promise<void> => {
  const body = validated<FuelLogBulkWriteRequest>(req, 'body');
  const fuelLogs = await fuelLogService.createFuelLogsBulk(body);

  sendSuccess(res, fuelLogs, 201);
};

export const updateFuelLog = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<FuelLogIdParams>(req, 'params');
  const body = validated<FuelLogCreateRequest>(req, 'body');
  const fuelLog = await fuelLogService.updateFuelLog(id, body);

  sendSuccess(res, fuelLog);
};

export const updateVehicleFuelLog = async (req: Request, res: Response): Promise<void> => {
  const { id, fuelLogId } = validated<FuelLogParams>(req, 'params');
  const body = validated<FuelLogWriteRequest>(req, 'body');
  const fuelLog = await fuelLogService.updateVehicleFuelLog(id, fuelLogId, body);

  sendSuccess(res, fuelLog);
};

export const deleteFuelLog = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<FuelLogIdParams>(req, 'params');
  const result = await fuelLogService.deleteFuelLog(id);

  sendSuccess(res, result);
};

export const deleteVehicleFuelLog = async (req: Request, res: Response): Promise<void> => {
  const { id, fuelLogId } = validated<FuelLogParams>(req, 'params');
  const result = await fuelLogService.deleteVehicleFuelLog(id, fuelLogId);

  sendSuccess(res, result);
};

export const listFuelSuppliers = async (_req: Request, res: Response): Promise<void> => {
  const suppliers = await fuelLogService.listFuelSuppliers();

  sendSuccess(res, suppliers);
};

export const getFuelConsumption = async (req: Request, res: Response): Promise<void> => {
  const query = validated<FuelConsumptionQuery>(req, 'query');
  const history = await fuelLogService.getFuelConsumption(query);

  sendSuccess(res, history);
};
