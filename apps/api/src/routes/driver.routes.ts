import { Router } from 'express';

import * as driverDocumentController from '../controllers/driver-document.controller';
import * as driverController from '../controllers/driver.controller';
import { validateRequest } from '../middleware/validate-request';
import {
  driverDocumentParamsSchema,
  driverDocumentWriteSchema,
  expiringDocumentsQuerySchema,
} from '../schemas/driver-document.schema';
import {
  driverIdParamsSchema,
  driverWriteSchema,
  listDriversQuerySchema,
} from '../schemas/driver.schema';
import { asyncHandler } from '../utils/async-handler';

export const driverRouter = Router();

driverRouter.get(
  '/',
  validateRequest({ query: listDriversQuerySchema }),
  asyncHandler(driverController.listDrivers),
);

driverRouter.post(
  '/',
  validateRequest({ body: driverWriteSchema }),
  asyncHandler(driverController.createDriver),
);

driverRouter.get(
  '/expiring-documents',
  validateRequest({ query: expiringDocumentsQuerySchema }),
  asyncHandler(driverDocumentController.listExpiringDocuments),
);

driverRouter.get(
  '/:id/documents',
  validateRequest({ params: driverIdParamsSchema }),
  asyncHandler(driverDocumentController.listDriverDocuments),
);

driverRouter.post(
  '/:id/documents',
  validateRequest({ params: driverIdParamsSchema, body: driverDocumentWriteSchema }),
  asyncHandler(driverDocumentController.createDriverDocument),
);

driverRouter.get(
  '/:id/documents/:documentId',
  validateRequest({ params: driverDocumentParamsSchema }),
  asyncHandler(driverDocumentController.getDriverDocument),
);

driverRouter.patch(
  '/:id/documents/:documentId',
  validateRequest({ params: driverDocumentParamsSchema, body: driverDocumentWriteSchema }),
  asyncHandler(driverDocumentController.updateDriverDocument),
);

driverRouter.delete(
  '/:id/documents/:documentId',
  validateRequest({ params: driverDocumentParamsSchema }),
  asyncHandler(driverDocumentController.deleteDriverDocument),
);

driverRouter.get(
  '/:id',
  validateRequest({ params: driverIdParamsSchema }),
  asyncHandler(driverController.getDriver),
);

driverRouter.patch(
  '/:id',
  validateRequest({ params: driverIdParamsSchema, body: driverWriteSchema }),
  asyncHandler(driverController.updateDriver),
);

driverRouter.delete(
  '/:id',
  validateRequest({ params: driverIdParamsSchema }),
  asyncHandler(driverController.deleteDriver),
);
