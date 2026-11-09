import type { Request, Response } from 'express';

import * as adminService from '../services/admin.service';
import { sendSuccess } from '../utils/api-response';

export const getSummary = async (_req: Request, res: Response): Promise<void> => {
  sendSuccess(res, await adminService.getAdminSummary());
};
