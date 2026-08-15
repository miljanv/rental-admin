import { Router } from 'express';

import * as absenceAttestationController from '../controllers/absence-attestation.controller';
import * as driverDocumentController from '../controllers/driver-document.controller';
import * as driverController from '../controllers/driver.controller';
import * as driverWorkController from '../controllers/driver-work.controller';
import * as generatedDocumentController from '../controllers/generated-document.controller';
import { uploadRateLimiter } from '../middleware/rate-limit';
import { validateRequest } from '../middleware/validate-request';
import {
  absenceAttestationParamsSchema,
  generateAbsenceAttestationSchema,
} from '../schemas/absence-attestation.schema';
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
import { listDriverWorkRecordsQuerySchema } from '../schemas/driver-work.schema';
import {
  generateEmploymentContractSchema,
  generateMaFormSchema,
} from '../schemas/generated-document.schema';
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

driverRouter.post(
  '/:id/generated-documents/employment-contract',
  uploadRateLimiter,
  validateRequest({ params: driverIdParamsSchema, body: generateEmploymentContractSchema }),
  asyncHandler(generatedDocumentController.generateEmploymentContract),
);

driverRouter.post(
  '/:id/generated-documents/ma-form',
  uploadRateLimiter,
  validateRequest({ params: driverIdParamsSchema, body: generateMaFormSchema }),
  asyncHandler(generatedDocumentController.generateMaForm),
);

driverRouter.get(
  '/:id/status-overview',
  validateRequest({ params: driverIdParamsSchema }),
  asyncHandler(driverController.getDriverStatusOverview),
);

driverRouter.get(
  '/:id/work-records',
  validateRequest({ params: driverIdParamsSchema, query: listDriverWorkRecordsQuerySchema }),
  asyncHandler(driverWorkController.listDriverWorkRecords),
);

driverRouter.get(
  '/:id/absence-attestations',
  validateRequest({ params: driverIdParamsSchema }),
  asyncHandler(absenceAttestationController.listAbsenceAttestations),
);

driverRouter.post(
  '/:id/absence-attestations',
  uploadRateLimiter,
  validateRequest({ params: driverIdParamsSchema, body: generateAbsenceAttestationSchema }),
  asyncHandler(absenceAttestationController.generateAbsenceAttestation),
);

driverRouter.delete(
  '/:id/absence-attestations/:attestationId',
  validateRequest({ params: absenceAttestationParamsSchema }),
  asyncHandler(absenceAttestationController.deleteAbsenceAttestation),
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
