import { Router } from 'express';

import * as contractDocumentController from '../controllers/contract-document.controller';
import * as contractController from '../controllers/contract.controller';
import { uploadRateLimiter } from '../middleware/rate-limit';
import { validateRequest } from '../middleware/validate-request';
import { contractDocumentParamsSchema } from '../schemas/contract-document.schema';
import {
  contractIdParamsSchema,
  contractWriteSchema,
  listContractsQuerySchema,
} from '../schemas/contract.schema';
import { asyncHandler } from '../utils/async-handler';

export const contractRouter = Router();

contractRouter.get(
  '/',
  validateRequest({ query: listContractsQuerySchema }),
  asyncHandler(contractController.listContracts),
);

contractRouter.post(
  '/',
  validateRequest({ body: contractWriteSchema }),
  asyncHandler(contractController.createContract),
);

contractRouter.get(
  '/:id/documents',
  validateRequest({ params: contractIdParamsSchema }),
  asyncHandler(contractDocumentController.listContractDocuments),
);

contractRouter.post(
  '/:id/documents/generate',
  uploadRateLimiter,
  validateRequest({ params: contractIdParamsSchema }),
  asyncHandler(contractDocumentController.generateContractDocument),
);

contractRouter.delete(
  '/:id/documents/:documentId',
  validateRequest({ params: contractDocumentParamsSchema }),
  asyncHandler(contractDocumentController.deleteContractDocument),
);

contractRouter.get(
  '/:id',
  validateRequest({ params: contractIdParamsSchema }),
  asyncHandler(contractController.getContract),
);

contractRouter.patch(
  '/:id',
  validateRequest({ params: contractIdParamsSchema, body: contractWriteSchema }),
  asyncHandler(contractController.updateContract),
);

contractRouter.delete(
  '/:id',
  validateRequest({ params: contractIdParamsSchema }),
  asyncHandler(contractController.deleteContract),
);
