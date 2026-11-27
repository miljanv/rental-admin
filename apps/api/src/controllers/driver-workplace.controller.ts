import type {
  DriverFuelEntryCreateRequest,
  DriverFuelEntryListQuery,
  DriverFuelEntryParams,
  DriverFuelEntryReviewRequest,
  DriverIdParams,
  DriverPortalToolCreateRequest,
  DriverPortalToolParams,
  DriverToolLostRequest,
  DriverToolOfficeActionRequest,
  DriverToolParams,
  DriverToolRespondRequest,
  DriverToolWriteRequest,
  VehicleFaultCreateRequest,
  VehicleFaultListQuery,
  VehicleFaultParams,
  VehicleFaultUpdateRequest,
} from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { currentDriverAccess } from '../middleware/require-driver-token';
import { validated } from '../middleware/validate-request';
import * as workplaceService from '../services/driver-workplace.service';
import { sendSuccess } from '../utils/api-response';

// --- Driver portal (acts for the driver of the link) -----------------------

export const listPortalVehicles = async (_req: Request, res: Response): Promise<void> => {
  sendSuccess(res, await workplaceService.listPortalVehicles());
};

export const listPortalFaults = async (req: Request, res: Response): Promise<void> => {
  const { driverId } = currentDriverAccess(req);

  sendSuccess(res, await workplaceService.listDriverFaults(driverId));
};

export const reportPortalFault = async (req: Request, res: Response): Promise<void> => {
  const { driverId } = currentDriverAccess(req);
  const body = validated<VehicleFaultCreateRequest>(req, 'body');

  sendSuccess(res, await workplaceService.reportVehicleFault(driverId, body), 201);
};

export const listPortalTools = async (req: Request, res: Response): Promise<void> => {
  const { driverId } = currentDriverAccess(req);

  sendSuccess(res, await workplaceService.listPortalTools(driverId));
};

export const addPortalTool = async (req: Request, res: Response): Promise<void> => {
  const { driverId } = currentDriverAccess(req);
  const body = validated<DriverPortalToolCreateRequest>(req, 'body');

  sendSuccess(res, await workplaceService.addPortalTool(driverId, body), 201);
};

export const confirmAllPortalTools = async (req: Request, res: Response): Promise<void> => {
  const { driverId } = currentDriverAccess(req);

  sendSuccess(res, await workplaceService.confirmAllTools(driverId));
};

export const respondToPortalTool = async (req: Request, res: Response): Promise<void> => {
  const { driverId } = currentDriverAccess(req);
  const { toolId } = validated<DriverPortalToolParams>(req, 'params');
  const body = validated<DriverToolRespondRequest>(req, 'body');

  sendSuccess(res, await workplaceService.respondToTool(driverId, toolId, body));
};

export const reportPortalToolLost = async (req: Request, res: Response): Promise<void> => {
  const { driverId } = currentDriverAccess(req);
  const { toolId } = validated<DriverPortalToolParams>(req, 'params');
  const body = validated<DriverToolLostRequest>(req, 'body');

  sendSuccess(res, await workplaceService.reportToolLost(driverId, toolId, body));
};

export const listPortalFuelEntries = async (req: Request, res: Response): Promise<void> => {
  const { driverId } = currentDriverAccess(req);

  sendSuccess(res, await workplaceService.listPortalFuelEntries(driverId));
};

export const submitPortalFuelEntry = async (req: Request, res: Response): Promise<void> => {
  const { driverId } = currentDriverAccess(req);
  const body = validated<DriverFuelEntryCreateRequest>(req, 'body');

  sendSuccess(res, await workplaceService.submitPortalFuelEntry(driverId, body), 201);
};

// --- Office ----------------------------------------------------------------

export const listVehicleFaults = async (req: Request, res: Response): Promise<void> => {
  const query = validated<VehicleFaultListQuery>(req, 'query');

  sendSuccess(res, await workplaceService.listVehicleFaults(query));
};

export const updateVehicleFault = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<VehicleFaultParams>(req, 'params');
  const body = validated<VehicleFaultUpdateRequest>(req, 'body');

  sendSuccess(res, await workplaceService.updateVehicleFault(id, body));
};

export const listDriverTools = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<DriverIdParams>(req, 'params');

  sendSuccess(res, await workplaceService.listDriverTools(id));
};

export const createDriverTool = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<DriverIdParams>(req, 'params');
  const body = validated<DriverToolWriteRequest>(req, 'body');

  sendSuccess(res, await workplaceService.createDriverTool(id, body), 201);
};

export const updateDriverTool = async (req: Request, res: Response): Promise<void> => {
  const { id, toolId } = validated<DriverToolParams>(req, 'params');
  const body = validated<DriverToolWriteRequest>(req, 'body');

  sendSuccess(res, await workplaceService.updateDriverTool(id, toolId, body));
};

export const applyDriverToolAction = async (req: Request, res: Response): Promise<void> => {
  const { id, toolId } = validated<DriverToolParams>(req, 'params');
  const body = validated<DriverToolOfficeActionRequest>(req, 'body');

  sendSuccess(res, await workplaceService.applyDriverToolAction(id, toolId, body));
};

export const deleteDriverTool = async (req: Request, res: Response): Promise<void> => {
  const { id, toolId } = validated<DriverToolParams>(req, 'params');

  await workplaceService.deleteDriverTool(id, toolId);
  sendSuccess(res, { id: toolId });
};

export const listDriverFuelEntries = async (req: Request, res: Response): Promise<void> => {
  const query = validated<DriverFuelEntryListQuery>(req, 'query');

  sendSuccess(res, await workplaceService.listDriverFuelEntries(query));
};

export const reviewDriverFuelEntry = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<DriverFuelEntryParams>(req, 'params');
  const body = validated<DriverFuelEntryReviewRequest>(req, 'body');

  sendSuccess(res, await workplaceService.reviewDriverFuelEntry(id, body));
};

export const listToolsNeedingOffice = async (_req: Request, res: Response): Promise<void> => {
  sendSuccess(res, await workplaceService.listToolsNeedingOffice());
};

export const countWorkplacePending = async (_req: Request, res: Response): Promise<void> => {
  sendSuccess(res, await workplaceService.countWorkplacePending());
};
