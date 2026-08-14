import type {
  ExpiringInspectionsQuery,
  VehicleIdParams,
  VehicleInspectionParams,
  VehicleInspectionWriteRequest,
} from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as vehicleInspectionService from '../services/vehicle-inspection.service';
import { sendSuccess } from '../utils/api-response';

export const listVehicleInspections = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<VehicleIdParams>(req, 'params');
  const inspections = await vehicleInspectionService.listVehicleInspections(id);

  sendSuccess(res, inspections);
};

export const getVehicleInspection = async (req: Request, res: Response): Promise<void> => {
  const { id, inspectionId } = validated<VehicleInspectionParams>(req, 'params');
  const inspection = await vehicleInspectionService.getVehicleInspection(id, inspectionId);

  sendSuccess(res, inspection);
};

export const createVehicleInspection = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<VehicleIdParams>(req, 'params');
  const body = validated<VehicleInspectionWriteRequest>(req, 'body');
  const inspection = await vehicleInspectionService.createVehicleInspection(id, body);

  sendSuccess(res, inspection, 201);
};

export const updateVehicleInspection = async (req: Request, res: Response): Promise<void> => {
  const { id, inspectionId } = validated<VehicleInspectionParams>(req, 'params');
  const body = validated<VehicleInspectionWriteRequest>(req, 'body');
  const inspection = await vehicleInspectionService.updateVehicleInspection(id, inspectionId, body);

  sendSuccess(res, inspection);
};

export const deleteVehicleInspection = async (req: Request, res: Response): Promise<void> => {
  const { id, inspectionId } = validated<VehicleInspectionParams>(req, 'params');
  const result = await vehicleInspectionService.deleteVehicleInspection(id, inspectionId);

  sendSuccess(res, result);
};

export const listExpiringInspections = async (req: Request, res: Response): Promise<void> => {
  const query = validated<ExpiringInspectionsQuery>(req, 'query');
  const inspections = await vehicleInspectionService.listExpiringInspections(query);

  sendSuccess(res, inspections);
};
