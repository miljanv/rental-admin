import type {
  DriverDocumentParams,
  DriverDocumentWriteRequest,
  DriverIdParams,
  ExpiringDocumentsQuery,
} from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as driverDocumentService from '../services/driver-document.service';
import { sendSuccess } from '../utils/api-response';

export const listDriverDocuments = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<DriverIdParams>(req, 'params');
  const documents = await driverDocumentService.listDriverDocuments(id);

  sendSuccess(res, documents);
};

export const getDriverDocument = async (req: Request, res: Response): Promise<void> => {
  const { id, documentId } = validated<DriverDocumentParams>(req, 'params');
  const document = await driverDocumentService.getDriverDocument(id, documentId);

  sendSuccess(res, document);
};

export const createDriverDocument = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<DriverIdParams>(req, 'params');
  const body = validated<DriverDocumentWriteRequest>(req, 'body');
  const document = await driverDocumentService.createDriverDocument(id, body);

  sendSuccess(res, document, 201);
};

export const updateDriverDocument = async (req: Request, res: Response): Promise<void> => {
  const { id, documentId } = validated<DriverDocumentParams>(req, 'params');
  const body = validated<DriverDocumentWriteRequest>(req, 'body');
  const document = await driverDocumentService.updateDriverDocument(id, documentId, body);

  sendSuccess(res, document);
};

export const deleteDriverDocument = async (req: Request, res: Response): Promise<void> => {
  const { id, documentId } = validated<DriverDocumentParams>(req, 'params');
  const result = await driverDocumentService.deleteDriverDocument(id, documentId);

  sendSuccess(res, result);
};

export const listExpiringDocuments = async (req: Request, res: Response): Promise<void> => {
  const query = validated<ExpiringDocumentsQuery>(req, 'query');
  const documents = await driverDocumentService.listExpiringDocuments(query);

  sendSuccess(res, documents);
};
