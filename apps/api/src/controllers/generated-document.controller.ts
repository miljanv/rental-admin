import type {
  DriverIdParams,
  GenerateEmploymentContractRequest,
  GenerateMaFormRequest,
} from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as generatedDocumentService from '../services/generated-document.service';
import { sendSuccess } from '../utils/api-response';

export const generateEmploymentContract = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<DriverIdParams>(req, 'params');
  const body = validated<GenerateEmploymentContractRequest>(req, 'body');
  const result = await generatedDocumentService.generateEmploymentContract(id, body);

  sendSuccess(res, result, 201);
};

export const generateMaForm = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<DriverIdParams>(req, 'params');
  const body = validated<GenerateMaFormRequest>(req, 'body');
  const result = await generatedDocumentService.generateMaForm(id, body);

  sendSuccess(res, result, 201);
};
