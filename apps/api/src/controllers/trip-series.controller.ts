import type {
  BulkUpdateTripSeriesRequest,
  GenerateTripSeriesRequest,
  TerminateTripSeriesRequest,
  TripSeriesIdParams,
} from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as tripSeriesService from '../services/trip-series.service';
import { sendSuccess } from '../utils/api-response';

export const generateTripSeries = async (req: Request, res: Response): Promise<void> => {
  const body = validated<GenerateTripSeriesRequest>(req, 'body');
  const result = await tripSeriesService.generateTripSeries(body);

  sendSuccess(res, result, 201);
};

export const getTripSeries = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<TripSeriesIdParams>(req, 'params');
  const result = await tripSeriesService.getTripSeries(id);

  sendSuccess(res, result);
};

export const bulkUpdateTripSeries = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<TripSeriesIdParams>(req, 'params');
  const body = validated<BulkUpdateTripSeriesRequest>(req, 'body');
  const result = await tripSeriesService.bulkUpdateTripSeries(id, body);

  sendSuccess(res, result);
};

export const terminateTripSeries = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<TripSeriesIdParams>(req, 'params');
  const body = validated<TerminateTripSeriesRequest>(req, 'body');
  const result = await tripSeriesService.terminateTripSeries(id, body);

  sendSuccess(res, result);
};
