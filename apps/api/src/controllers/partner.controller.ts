import type { ListPartnersQuery, PartnerIdParams, PartnerWriteRequest } from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as partnerService from '../services/partner.service';
import { sendPaginated, sendSuccess } from '../utils/api-response';

export const listPartners = async (req: Request, res: Response): Promise<void> => {
  const query = validated<ListPartnersQuery>(req, 'query');
  const { partners, pagination } = await partnerService.listPartners(query);

  sendPaginated(res, partners, pagination);
};

export const getPartner = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<PartnerIdParams>(req, 'params');
  const partner = await partnerService.getPartner(id);

  sendSuccess(res, partner);
};

export const createPartner = async (req: Request, res: Response): Promise<void> => {
  const body = validated<PartnerWriteRequest>(req, 'body');
  const partner = await partnerService.createPartner(body);

  sendSuccess(res, partner, 201);
};

export const updatePartner = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<PartnerIdParams>(req, 'params');
  const body = validated<PartnerWriteRequest>(req, 'body');
  const partner = await partnerService.updatePartner(id, body);

  sendSuccess(res, partner);
};

export const deletePartner = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<PartnerIdParams>(req, 'params');
  const result = await partnerService.deletePartner(id);

  sendSuccess(res, result);
};
