import type { AuthUserDto, LoginRequest, OrganizationUsageDto } from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { currentUser } from '../middleware/require-auth';
import { validated } from '../middleware/validate-request';
import * as authService from '../services/auth.service';
import { getCurrentOrganizationUsage } from '../services/organization-limit.service';
import { sendSuccess } from '../utils/api-response';

export const login = async (req: Request, res: Response): Promise<void> => {
  const body = validated<LoginRequest>(req, 'body');
  const result = await authService.login(body);

  sendSuccess(res, result);
};

export const me = async (req: Request, res: Response): Promise<void> => {
  const user = authService.getCurrentUser(currentUser(req));

  sendSuccess<AuthUserDto>(res, user);
};

/** Limits and usage of the organization the request works in; null without one. */
export const usage = async (_req: Request, res: Response): Promise<void> => {
  const result = await getCurrentOrganizationUsage();

  sendSuccess<OrganizationUsageDto | null>(res, result);
};
