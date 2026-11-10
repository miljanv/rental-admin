import type {
  AcceptDriverReportRequest,
  DriverReportParams,
  ListDriverReportsQuery,
  ReturnDriverReportRequest,
} from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as driverReportService from '../services/driver-report.service';
import { sendPaginated, sendSuccess } from '../utils/api-response';

export const listDriverReports = async (req: Request, res: Response): Promise<void> => {
  const query = validated<ListDriverReportsQuery>(req, 'query');
  const { reports, pagination } = await driverReportService.listDriverReports(query);

  sendPaginated(res, reports, pagination);
};

export const countPendingDriverReports = async (_req: Request, res: Response): Promise<void> => {
  sendSuccess(res, await driverReportService.countPendingDriverReports());
};

export const listMissingDriverReports = async (_req: Request, res: Response): Promise<void> => {
  sendSuccess(res, await driverReportService.listMissingDriverReports());
};

export const getDriverReport = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<DriverReportParams>(req, 'params');

  sendSuccess(res, await driverReportService.getDriverReport(id));
};

export const acceptDriverReport = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<DriverReportParams>(req, 'params');
  const body = validated<AcceptDriverReportRequest>(req, 'body');

  sendSuccess(res, await driverReportService.acceptDriverReport(id, body));
};

export const returnDriverReport = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<DriverReportParams>(req, 'params');
  const body = validated<ReturnDriverReportRequest>(req, 'body');

  sendSuccess(res, await driverReportService.returnDriverReport(id, body));
};
