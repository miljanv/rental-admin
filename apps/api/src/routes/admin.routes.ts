import { Router } from 'express';

import * as adminController from '../controllers/admin.controller';
import * as announcementController from '../controllers/announcement.controller';
import { validateRequest } from '../middleware/validate-request';
import {
  announcementIdParamsSchema,
  announcementWriteSchema,
} from '../schemas/announcement.schema';
import { listAuditEventsQuerySchema } from '../schemas/audit.schema';
import { asyncHandler } from '../utils/async-handler';

export const adminRouter = Router();

adminRouter.get('/summary', asyncHandler(adminController.getSummary));

adminRouter.get(
  '/audit-events',
  validateRequest({ query: listAuditEventsQuerySchema }),
  asyncHandler(adminController.listAuditEvents),
);

adminRouter.get(
  '/finance-audit-events',
  validateRequest({ query: listAuditEventsQuerySchema }),
  asyncHandler(adminController.listFinanceAuditEvents),
);

adminRouter.get('/announcements', asyncHandler(announcementController.listAnnouncements));

adminRouter.post(
  '/announcements',
  validateRequest({ body: announcementWriteSchema }),
  asyncHandler(announcementController.createAnnouncement),
);

adminRouter.patch(
  '/announcements/:id',
  validateRequest({ params: announcementIdParamsSchema, body: announcementWriteSchema }),
  asyncHandler(announcementController.updateAnnouncement),
);

adminRouter.delete(
  '/announcements/:id',
  validateRequest({ params: announcementIdParamsSchema }),
  asyncHandler(announcementController.deleteAnnouncement),
);
