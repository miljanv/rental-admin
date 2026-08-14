import type { ListVehiclesQuery, VehicleIdParams, VehicleWriteRequest } from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as vehicleService from '../services/vehicle.service';
import { sendPaginated, sendSuccess } from '../utils/api-response';

export const listVehicles = async (req: Request, res: Response): Promise<void> => {
  const query = validated<ListVehiclesQuery>(req, 'query');
  const { vehicles, pagination } = await vehicleService.listVehicles(query);

  sendPaginated(res, vehicles, pagination);
};

export const getVehicle = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<VehicleIdParams>(req, 'params');
  const vehicle = await vehicleService.getVehicle(id);

  sendSuccess(res, vehicle);
};

export const createVehicle = async (req: Request, res: Response): Promise<void> => {
  const body = validated<VehicleWriteRequest>(req, 'body');
  const vehicle = await vehicleService.createVehicle(body);

  sendSuccess(res, vehicle, 201);
};

export const updateVehicle = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<VehicleIdParams>(req, 'params');
  const body = validated<VehicleWriteRequest>(req, 'body');
  const vehicle = await vehicleService.updateVehicle(id, body);

  sendSuccess(res, vehicle);
};

export const deleteVehicle = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<VehicleIdParams>(req, 'params');
  const result = await vehicleService.deleteVehicle(id);

  sendSuccess(res, result);
};
