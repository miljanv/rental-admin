import type {
  VehicleDocumentParams,
  VehicleDocumentWriteRequest,
  VehicleIdParams,
} from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as vehicleDocumentService from '../services/vehicle-document.service';
import { sendSuccess } from '../utils/api-response';

export const listVehicleDocuments = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<VehicleIdParams>(req, 'params');
  const documents = await vehicleDocumentService.listVehicleDocuments(id);

  sendSuccess(res, documents);
};

export const getVehicleDocument = async (req: Request, res: Response): Promise<void> => {
  const { id, documentId } = validated<VehicleDocumentParams>(req, 'params');
  const document = await vehicleDocumentService.getVehicleDocument(id, documentId);

  sendSuccess(res, document);
};

export const createVehicleDocument = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<VehicleIdParams>(req, 'params');
  const body = validated<VehicleDocumentWriteRequest>(req, 'body');
  const document = await vehicleDocumentService.createVehicleDocument(id, body);

  sendSuccess(res, document, 201);
};

export const updateVehicleDocument = async (req: Request, res: Response): Promise<void> => {
  const { id, documentId } = validated<VehicleDocumentParams>(req, 'params');
  const body = validated<VehicleDocumentWriteRequest>(req, 'body');
  const document = await vehicleDocumentService.updateVehicleDocument(id, documentId, body);

  sendSuccess(res, document);
};

export const deleteVehicleDocument = async (req: Request, res: Response): Promise<void> => {
  const { id, documentId } = validated<VehicleDocumentParams>(req, 'params');
  const result = await vehicleDocumentService.deleteVehicleDocument(id, documentId);

  sendSuccess(res, result);
};
