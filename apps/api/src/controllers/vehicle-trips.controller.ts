import type { VehicleIdParams, VehicleTripsQuery } from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as vehicleTripsService from '../services/vehicle-trips.service';
import { sendSuccess } from '../utils/api-response';

export const getVehicleTripsSummary = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<VehicleIdParams>(req, 'params');
  const query = validated<VehicleTripsQuery>(req, 'query');
  const summary = await vehicleTripsService.getVehicleTripsSummary(id, query);

  sendSuccess(res, summary);
};
