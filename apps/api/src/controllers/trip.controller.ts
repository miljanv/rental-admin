import type {
  ListTripsQuery,
  TripIdParams,
  TripStatsQueryRequest,
  TripWriteRequest,
} from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as tripService from '../services/trip.service';
import { sendPaginated, sendSuccess } from '../utils/api-response';

export const listTrips = async (req: Request, res: Response): Promise<void> => {
  const query = validated<ListTripsQuery>(req, 'query');
  const { trips, pagination } = await tripService.listTrips(query);

  sendPaginated(res, trips, pagination);
};

export const getTripStats = async (req: Request, res: Response): Promise<void> => {
  const query = validated<TripStatsQueryRequest>(req, 'query');
  const stats = await tripService.getTripStats(query);

  sendSuccess(res, stats);
};

export const getTrip = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<TripIdParams>(req, 'params');
  const trip = await tripService.getTrip(id);

  sendSuccess(res, trip);
};

export const createTrip = async (req: Request, res: Response): Promise<void> => {
  const body = validated<TripWriteRequest>(req, 'body');
  const trip = await tripService.createTrip(body);

  sendSuccess(res, trip, 201);
};

export const updateTrip = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<TripIdParams>(req, 'params');
  const body = validated<TripWriteRequest>(req, 'body');
  const trip = await tripService.updateTrip(id, body);

  sendSuccess(res, trip);
};

export const deleteTrip = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<TripIdParams>(req, 'params');
  const result = await tripService.deleteTrip(id);

  sendSuccess(res, result);
};
