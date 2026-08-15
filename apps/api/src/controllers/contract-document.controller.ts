import type { ContractDocumentParams, ContractIdParams } from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as contractDocumentService from '../services/contract-document.service';
import { sendSuccess } from '../utils/api-response';

export const listContractDocuments = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<ContractIdParams>(req, 'params');
  const documents = await contractDocumentService.listContractDocuments(id);

  sendSuccess(res, documents);
};

export const generateContractDocument = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<ContractIdParams>(req, 'params');
  const result = await contractDocumentService.generateContractDocument(id);

  sendSuccess(res, result, 201);
};

export const deleteContractDocument = async (req: Request, res: Response): Promise<void> => {
  const { id, documentId } = validated<ContractDocumentParams>(req, 'params');
  const result = await contractDocumentService.deleteContractDocument(id, documentId);

  sendSuccess(res, result);
};
