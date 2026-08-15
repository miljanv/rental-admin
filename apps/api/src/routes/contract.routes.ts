import { Router } from 'express';

import * as contractDocumentController from '../controllers/contract-document.controller';
import * as contractController from '../controllers/contract.controller';
import * as passengerListController from '../controllers/passenger-list.controller';
import * as travelPermitController from '../controllers/travel-permit.controller';
import { uploadRateLimiter } from '../middleware/rate-limit';
import { validateRequest } from '../middleware/validate-request';
import { contractDocumentParamsSchema } from '../schemas/contract-document.schema';
import {
  contractAvailabilityQuerySchema,
  contractIdParamsSchema,
  contractStatusChangeSchema,
  contractWriteSchema,
  listContractsQuerySchema,
} from '../schemas/contract.schema';
import {
  passengerListParamsSchema,
  passengerListWriteSchema,
  passengerParamsSchema,
  passengerWriteSchema,
} from '../schemas/passenger-list.schema';
import { travelPermitParamsSchema, travelPermitWriteSchema } from '../schemas/travel-permit.schema';
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

// Static/collection routes MUST be declared before the `/:id` routes to avoid
// "availability" being captured as an :id param.
contractRouter.get(
  '/availability',
  validateRequest({ query: contractAvailabilityQuerySchema }),
  asyncHandler(contractController.checkContractAvailability),
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
  '/:id/passenger-lists',
  validateRequest({ params: contractIdParamsSchema }),
  asyncHandler(passengerListController.listPassengerLists),
);

contractRouter.post(
  '/:id/passenger-lists',
  validateRequest({ params: contractIdParamsSchema, body: passengerListWriteSchema }),
  asyncHandler(passengerListController.createPassengerList),
);

contractRouter.delete(
  '/:id/passenger-lists/:listId',
  validateRequest({ params: passengerListParamsSchema }),
  asyncHandler(passengerListController.deletePassengerList),
);

contractRouter.post(
  '/:id/passenger-lists/:listId/passengers',
  validateRequest({ params: passengerListParamsSchema, body: passengerWriteSchema }),
  asyncHandler(passengerListController.addPassenger),
);

contractRouter.patch(
  '/:id/passenger-lists/:listId/passengers/:passengerId',
  validateRequest({ params: passengerParamsSchema, body: passengerWriteSchema }),
  asyncHandler(passengerListController.updatePassenger),
);

contractRouter.delete(
  '/:id/passenger-lists/:listId/passengers/:passengerId',
  validateRequest({ params: passengerParamsSchema }),
  asyncHandler(passengerListController.deletePassenger),
);

contractRouter.get(
  '/:id/travel-permits',
  validateRequest({ params: contractIdParamsSchema }),
  asyncHandler(travelPermitController.listTravelPermits),
);

contractRouter.post(
  '/:id/travel-permits',
  validateRequest({ params: contractIdParamsSchema, body: travelPermitWriteSchema }),
  asyncHandler(travelPermitController.createTravelPermit),
);

contractRouter.patch(
  '/:id/travel-permits/:permitId',
  validateRequest({ params: travelPermitParamsSchema, body: travelPermitWriteSchema }),
  asyncHandler(travelPermitController.updateTravelPermit),
);

contractRouter.delete(
  '/:id/travel-permits/:permitId',
  validateRequest({ params: travelPermitParamsSchema }),
  asyncHandler(travelPermitController.deleteTravelPermit),
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

contractRouter.patch(
  '/:id/status',
  validateRequest({ params: contractIdParamsSchema, body: contractStatusChangeSchema }),
  asyncHandler(contractController.changeContractStatus),
);

contractRouter.delete(
  '/:id',
  validateRequest({ params: contractIdParamsSchema }),
  asyncHandler(contractController.deleteContract),
);
