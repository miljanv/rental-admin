import type { Request, Response } from 'express';
import type { VatReturnWriteRequest } from '@rental-admin/shared';

import { validated } from '../middleware/validate-request';
import { sendSuccess } from '../utils/api-response';
import * as vatReturnService from '../services/vat-return.service';

const requestId = (req: Request): string => validated<{ id: string }>(req, 'params').id;

export const createVatReturn = async (req: Request, res: Response): Promise<void> => {
  sendSuccess(
    res,
    await vatReturnService.createVatReturn(validated<VatReturnWriteRequest>(req, 'body')),
    201,
  );
};

export const updateVatReturn = async (req: Request, res: Response): Promise<void> => {
  sendSuccess(
    res,
    await vatReturnService.updateVatReturn(
      requestId(req),
      validated<VatReturnWriteRequest>(req, 'body'),
    ),
  );
};

export const deleteVatReturn = async (req: Request, res: Response): Promise<void> => {
  sendSuccess(res, await vatReturnService.deleteVatReturn(requestId(req)));
};
