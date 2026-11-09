import type { ListAuditEventsQuery } from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as adminService from '../services/admin.service';
import * as auditService from '../services/audit.service';
import { sendPaginated, sendSuccess } from '../utils/api-response';

export const getSummary = async (_req: Request, res: Response): Promise<void> => {
  sendSuccess(res, await adminService.getAdminSummary());
};

export const listAuditEvents = async (req: Request, res: Response): Promise<void> => {
  const query = validated<ListAuditEventsQuery>(req, 'query');
  const { events, pagination } = await auditService.listAuditEvents(query);

  sendPaginated(res, events, pagination);
};

export const listFinanceAuditEvents = async (req: Request, res: Response): Promise<void> => {
  const query = validated<ListAuditEventsQuery>(req, 'query');
  const { events, pagination } = await auditService.listFinanceAuditEvents(query);

  sendPaginated(res, events, pagination);
};
