import type {
  ExpiringCalibrationsQuery,
  TachographCalibrationParams,
  TachographCalibrationWriteRequest,
  VehicleIdParams,
} from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as tachographCalibrationService from '../services/tachograph-calibration.service';
import { sendSuccess } from '../utils/api-response';

export const listTachographCalibrations = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<VehicleIdParams>(req, 'params');
  const calibrations = await tachographCalibrationService.listTachographCalibrations(id);

  sendSuccess(res, calibrations);
};

export const getTachographCalibration = async (req: Request, res: Response): Promise<void> => {
  const { id, calibrationId } = validated<TachographCalibrationParams>(req, 'params');
  const calibration = await tachographCalibrationService.getTachographCalibration(
    id,
    calibrationId,
  );

  sendSuccess(res, calibration);
};

export const createTachographCalibration = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<VehicleIdParams>(req, 'params');
  const body = validated<TachographCalibrationWriteRequest>(req, 'body');
  const calibration = await tachographCalibrationService.createTachographCalibration(id, body);

  sendSuccess(res, calibration, 201);
};

export const updateTachographCalibration = async (req: Request, res: Response): Promise<void> => {
  const { id, calibrationId } = validated<TachographCalibrationParams>(req, 'params');
  const body = validated<TachographCalibrationWriteRequest>(req, 'body');
  const calibration = await tachographCalibrationService.updateTachographCalibration(
    id,
    calibrationId,
    body,
  );

  sendSuccess(res, calibration);
};

export const deleteTachographCalibration = async (req: Request, res: Response): Promise<void> => {
  const { id, calibrationId } = validated<TachographCalibrationParams>(req, 'params');
  const result = await tachographCalibrationService.deleteTachographCalibration(id, calibrationId);

  sendSuccess(res, result);
};

export const listExpiringCalibrations = async (req: Request, res: Response): Promise<void> => {
  const query = validated<ExpiringCalibrationsQuery>(req, 'query');
  const calibrations = await tachographCalibrationService.listExpiringCalibrations(query);

  sendSuccess(res, calibrations);
};
