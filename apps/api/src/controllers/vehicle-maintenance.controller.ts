import type {
  ListVehicleMaintenanceQuery,
  MaintenanceCostSummaryQuery,
  VehicleIdParams,
  VehicleMaintenanceParams,
  VehicleMaintenanceWriteRequest,
} from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as vehicleMaintenanceService from '../services/vehicle-maintenance.service';
import { sendSuccess } from '../utils/api-response';

export const listVehicleMaintenance = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<VehicleIdParams>(req, 'params');
  const query = validated<ListVehicleMaintenanceQuery>(req, 'query');
  const records = await vehicleMaintenanceService.listVehicleMaintenance(id, query);

  sendSuccess(res, records);
};

export const getVehicleMaintenance = async (req: Request, res: Response): Promise<void> => {
  const { id, maintenanceId } = validated<VehicleMaintenanceParams>(req, 'params');
  const record = await vehicleMaintenanceService.getVehicleMaintenance(id, maintenanceId);

  sendSuccess(res, record);
};

export const createVehicleMaintenance = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<VehicleIdParams>(req, 'params');
  const body = validated<VehicleMaintenanceWriteRequest>(req, 'body');
  const record = await vehicleMaintenanceService.createVehicleMaintenance(id, body);

  sendSuccess(res, record, 201);
};

export const updateVehicleMaintenance = async (req: Request, res: Response): Promise<void> => {
  const { id, maintenanceId } = validated<VehicleMaintenanceParams>(req, 'params');
  const body = validated<VehicleMaintenanceWriteRequest>(req, 'body');
  const record = await vehicleMaintenanceService.updateVehicleMaintenance(id, maintenanceId, body);

  sendSuccess(res, record);
};

export const deleteVehicleMaintenance = async (req: Request, res: Response): Promise<void> => {
  const { id, maintenanceId } = validated<VehicleMaintenanceParams>(req, 'params');
  const result = await vehicleMaintenanceService.deleteVehicleMaintenance(id, maintenanceId);

  sendSuccess(res, result);
};

export const getMaintenanceCostSummary = async (req: Request, res: Response): Promise<void> => {
  const query = validated<MaintenanceCostSummaryQuery>(req, 'query');
  const summary = await vehicleMaintenanceService.getMaintenanceCostSummary(query);

  sendSuccess(res, summary);
};
