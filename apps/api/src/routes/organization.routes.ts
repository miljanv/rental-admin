import { Router } from 'express';

import * as organizationController from '../controllers/organization.controller';
import { validateRequest } from '../middleware/validate-request';
import {
  organizationIdParamsSchema,
  organizationProfileSchema,
  organizationWriteSchema,
} from '../schemas/user-admin.schema';
import { asyncHandler } from '../utils/async-handler';

export const organizationRouter = Router();

organizationRouter.get('/', asyncHandler(organizationController.listOrganizations));

organizationRouter.post(
  '/',
  validateRequest({ body: organizationWriteSchema }),
  asyncHandler(organizationController.createOrganization),
);

organizationRouter.get(
  '/:id',
  validateRequest({ params: organizationIdParamsSchema }),
  asyncHandler(organizationController.getOrganization),
);

organizationRouter.get(
  '/:id/overview',
  validateRequest({ params: organizationIdParamsSchema }),
  asyncHandler(organizationController.getOrganizationOverview),
);

organizationRouter.patch(
  '/:id/profile',
  validateRequest({ params: organizationIdParamsSchema, body: organizationProfileSchema }),
  asyncHandler(organizationController.updateOrganizationProfile),
);

organizationRouter.patch(
  '/:id',
  validateRequest({ params: organizationIdParamsSchema, body: organizationWriteSchema }),
  asyncHandler(organizationController.updateOrganization),
);

organizationRouter.delete(
  '/:id',
  validateRequest({ params: organizationIdParamsSchema }),
  asyncHandler(organizationController.deleteOrganization),
);
