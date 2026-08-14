import type {
  ExpiringSafetyEquipmentQuery,
  VehicleIdParams,
  VehicleSafetyEquipmentParams,
  VehicleSafetyEquipmentWriteRequest,
} from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as vehicleSafetyEquipmentService from '../services/vehicle-safety-equipment.service';
import { sendSuccess } from '../utils/api-response';

export const listVehicleSafetyEquipment = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<VehicleIdParams>(req, 'params');
  const equipment = await vehicleSafetyEquipmentService.listVehicleSafetyEquipment(id);

  sendSuccess(res, equipment);
};

export const getVehicleSafetyEquipment = async (req: Request, res: Response): Promise<void> => {
  const { id, equipmentId } = validated<VehicleSafetyEquipmentParams>(req, 'params');
  const equipment = await vehicleSafetyEquipmentService.getVehicleSafetyEquipment(id, equipmentId);

  sendSuccess(res, equipment);
};

export const createVehicleSafetyEquipment = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<VehicleIdParams>(req, 'params');
  const body = validated<VehicleSafetyEquipmentWriteRequest>(req, 'body');
  const equipment = await vehicleSafetyEquipmentService.createVehicleSafetyEquipment(id, body);

  sendSuccess(res, equipment, 201);
};

export const updateVehicleSafetyEquipment = async (req: Request, res: Response): Promise<void> => {
  const { id, equipmentId } = validated<VehicleSafetyEquipmentParams>(req, 'params');
  const body = validated<VehicleSafetyEquipmentWriteRequest>(req, 'body');
  const equipment = await vehicleSafetyEquipmentService.updateVehicleSafetyEquipment(
    id,
    equipmentId,
    body,
  );

  sendSuccess(res, equipment);
};

export const deleteVehicleSafetyEquipment = async (req: Request, res: Response): Promise<void> => {
  const { id, equipmentId } = validated<VehicleSafetyEquipmentParams>(req, 'params');
  const result = await vehicleSafetyEquipmentService.deleteVehicleSafetyEquipment(id, equipmentId);

  sendSuccess(res, result);
};

export const listExpiringSafetyEquipment = async (req: Request, res: Response): Promise<void> => {
  const query = validated<ExpiringSafetyEquipmentQuery>(req, 'query');
  const equipment = await vehicleSafetyEquipmentService.listExpiringSafetyEquipment(query);

  sendSuccess(res, equipment);
};
