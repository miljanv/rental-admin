import type { AnnouncementIdParams, AnnouncementWriteRequest } from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { currentUser } from '../middleware/require-auth';
import { validated } from '../middleware/validate-request';
import * as announcementService from '../services/announcement.service';
import { sendSuccess } from '../utils/api-response';

export const listAnnouncements = async (_req: Request, res: Response): Promise<void> => {
  sendSuccess(res, await announcementService.listAnnouncements());
};

export const createAnnouncement = async (req: Request, res: Response): Promise<void> => {
  const body = validated<AnnouncementWriteRequest>(req, 'body');

  sendSuccess(res, await announcementService.createAnnouncement(body, currentUser(req).id), 201);
};

export const updateAnnouncement = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<AnnouncementIdParams>(req, 'params');
  const body = validated<AnnouncementWriteRequest>(req, 'body');

  sendSuccess(res, await announcementService.updateAnnouncement(id, body));
};

export const deleteAnnouncement = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<AnnouncementIdParams>(req, 'params');

  sendSuccess(res, await announcementService.deleteAnnouncement(id));
};

export const listActiveAnnouncements = async (req: Request, res: Response): Promise<void> => {
  sendSuccess(res, await announcementService.listActiveAnnouncements(currentUser(req).id));
};

export const dismissAnnouncement = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<AnnouncementIdParams>(req, 'params');

  sendSuccess(res, await announcementService.dismissAnnouncement(id, currentUser(req).id));
};
