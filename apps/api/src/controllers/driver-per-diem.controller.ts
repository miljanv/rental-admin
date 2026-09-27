import type {
  DriverIdParams,
  GenerateDriverMonthlyPayoutRequest,
  GenerateDriverPerDiemDocumentRequest,
  ListDriverPerDiemsQuery,
  ListDriverStatisticsQuery,
} from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as driverPerDiemService from '../services/driver-per-diem.service';
import { sendSuccess } from '../utils/api-response';
import { buildContentDisposition } from '../utils/storage-key';

const sendFile = (
  res: Response,
  file: { buffer: Buffer; fileName: string; mimeType: string },
): void => {
  res.status(200);
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', buildContentDisposition(file.fileName));
  res.setHeader('Content-Length', String(file.buffer.length));
  res.end(file.buffer);
};

export const getDriverPerDiemLedger = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<DriverIdParams>(req, 'params');
  const query = validated<ListDriverPerDiemsQuery>(req, 'query');
  const ledger = await driverPerDiemService.getDriverPerDiemLedger(id, query);

  sendSuccess(res, ledger);
};

export const getDriverStatistics = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<DriverIdParams>(req, 'params');
  const query = validated<ListDriverStatisticsQuery>(req, 'query');
  const stats = await driverPerDiemService.getDriverStatistics(id, query);

  sendSuccess(res, stats);
};

export const generateTravelDecision = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<DriverIdParams>(req, 'params');
  const body = validated<GenerateDriverPerDiemDocumentRequest>(req, 'body');
  const file = await driverPerDiemService.generateTravelDecision(id, body);

  sendFile(res, file);
};

export const generateTravelOrder = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<DriverIdParams>(req, 'params');
  const body = validated<GenerateDriverPerDiemDocumentRequest>(req, 'body');
  const file = await driverPerDiemService.generateTravelOrder(id, body);

  sendFile(res, file);
};

export const generateTravelSettlement = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<DriverIdParams>(req, 'params');
  const body = validated<GenerateDriverPerDiemDocumentRequest>(req, 'body');
  const file = await driverPerDiemService.generateTravelSettlement(id, body);

  sendFile(res, file);
};

export const generateMonthlyPayout = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<DriverIdParams>(req, 'params');
  const body = validated<GenerateDriverMonthlyPayoutRequest>(req, 'body');
  const file = await driverPerDiemService.generateMonthlyPayout(id, body);

  sendFile(res, file);
};
