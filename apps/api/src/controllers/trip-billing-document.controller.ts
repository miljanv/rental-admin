import type { TripIdParams } from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as tripBillingDocumentService from '../services/trip-billing-document.service';
import { sendSuccess } from '../utils/api-response';

export const listTripBillingDocuments = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<TripIdParams>(req, 'params');
  const documents = await tripBillingDocumentService.listTripBillingDocuments(id);

  sendSuccess(res, documents);
};

export const generatePredracun = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<TripIdParams>(req, 'params');
  const result = await tripBillingDocumentService.generateTripBillingDocument(id, 'PREDRACUN');

  sendSuccess(res, result, 201);
};

export const generateRacun = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<TripIdParams>(req, 'params');
  const result = await tripBillingDocumentService.generateTripBillingDocument(id, 'RACUN');

  sendSuccess(res, result, 201);
};
