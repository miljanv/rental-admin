import type {
  OrganizationIdParams,
  OrganizationProfileRequest,
  OrganizationWriteRequest,
} from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as organizationService from '../services/organization.service';
import { sendSuccess } from '../utils/api-response';

export const listOrganizations = async (_req: Request, res: Response): Promise<void> => {
  sendSuccess(res, await organizationService.listOrganizations());
};

export const getOrganization = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<OrganizationIdParams>(req, 'params');

  sendSuccess(res, await organizationService.getOrganization(id));
};

export const getOrganizationOverview = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<OrganizationIdParams>(req, 'params');

  sendSuccess(res, await organizationService.getOrganizationOverview(id));
};

export const updateOrganizationProfile = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<OrganizationIdParams>(req, 'params');
  const body = validated<OrganizationProfileRequest>(req, 'body');

  sendSuccess(res, await organizationService.updateOrganizationProfile(id, body));
};

export const createOrganization = async (req: Request, res: Response): Promise<void> => {
  const body = validated<OrganizationWriteRequest>(req, 'body');

  sendSuccess(res, await organizationService.createOrganization(body), 201);
};

export const updateOrganization = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<OrganizationIdParams>(req, 'params');
  const body = validated<OrganizationWriteRequest>(req, 'body');

  sendSuccess(res, await organizationService.updateOrganization(id, body));
};

export const deleteOrganization = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<OrganizationIdParams>(req, 'params');

  sendSuccess(res, await organizationService.deleteOrganization(id));
};
