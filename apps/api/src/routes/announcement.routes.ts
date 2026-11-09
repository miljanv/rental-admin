import { Router } from 'express';

import * as announcementController from '../controllers/announcement.controller';
import { validateRequest } from '../middleware/validate-request';
import { announcementIdParamsSchema } from '../schemas/announcement.schema';
import { asyncHandler } from '../utils/async-handler';

/** What every signed-in user can do with banners: see the active ones and close them. */
export const announcementRouter = Router();

announcementRouter.get('/active', asyncHandler(announcementController.listActiveAnnouncements));

announcementRouter.post(
  '/:id/dismiss',
  validateRequest({ params: announcementIdParamsSchema }),
  asyncHandler(announcementController.dismissAnnouncement),
);
