import type {
  DriverPortalTripParams,
  DriverReportWriteRequest,
  PresignUploadRequest,
} from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { currentDriverAccess } from '../middleware/require-driver-token';
import { validated } from '../middleware/validate-request';
import * as driverPortalService from '../services/driver-portal.service';
import { sendSuccess } from '../utils/api-response';

export const getMe = async (req: Request, res: Response): Promise<void> => {
  const access = currentDriverAccess(req);

  sendSuccess(
    res,
    await driverPortalService.getDriverPortalMe(access.driverId, access.organizationId),
  );
};

export const listTrips = async (req: Request, res: Response): Promise<void> => {
  const access = currentDriverAccess(req);

  sendSuccess(res, await driverPortalService.listDriverPortalTrips(access.driverId));
};

export const getTrip = async (req: Request, res: Response): Promise<void> => {
  const access = currentDriverAccess(req);
  const { id } = validated<DriverPortalTripParams>(req, 'params');

  sendSuccess(res, await driverPortalService.getDriverPortalTrip(access.driverId, id));
};

export const submitReport = async (req: Request, res: Response): Promise<void> => {
  const access = currentDriverAccess(req);
  const { id } = validated<DriverPortalTripParams>(req, 'params');
  const body = validated<DriverReportWriteRequest>(req, 'body');

  sendSuccess(res, await driverPortalService.submitDriverReport(access.driverId, id, body));
};

export const presignReceipt = async (req: Request, res: Response): Promise<void> => {
  currentDriverAccess(req);
  const body = validated<PresignUploadRequest>(req, 'body');

  sendSuccess(res, await driverPortalService.createReceiptUpload(body), 201);
};

export const confirmReceipt = async (req: Request, res: Response): Promise<void> => {
  currentDriverAccess(req);
  const { id } = validated<{ id: string }>(req, 'params');

  sendSuccess(res, await driverPortalService.confirmReceiptUpload(id));
};
