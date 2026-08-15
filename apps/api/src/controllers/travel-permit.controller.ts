import type {
  ContractIdParams,
  TravelPermitParams,
  TravelPermitWriteRequest,
} from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as travelPermitService from '../services/travel-permit.service';
import { sendSuccess } from '../utils/api-response';

export const listTravelPermits = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<ContractIdParams>(req, 'params');
  const permits = await travelPermitService.listTravelPermits(id);

  sendSuccess(res, permits);
};

export const createTravelPermit = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<ContractIdParams>(req, 'params');
  const body = validated<TravelPermitWriteRequest>(req, 'body');
  const permit = await travelPermitService.createTravelPermit(id, body);

  sendSuccess(res, permit, 201);
};

export const updateTravelPermit = async (req: Request, res: Response): Promise<void> => {
  const { id, permitId } = validated<TravelPermitParams>(req, 'params');
  const body = validated<TravelPermitWriteRequest>(req, 'body');
  const permit = await travelPermitService.updateTravelPermit(id, permitId, body);

  sendSuccess(res, permit);
};

export const deleteTravelPermit = async (req: Request, res: Response): Promise<void> => {
  const { id, permitId } = validated<TravelPermitParams>(req, 'params');
  const result = await travelPermitService.deleteTravelPermit(id, permitId);

  sendSuccess(res, result);
};
