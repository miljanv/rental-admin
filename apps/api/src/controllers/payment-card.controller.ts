import type { PaymentCardParams, PaymentCardWriteRequest } from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as paymentCardService from '../services/payment-card.service';
import { sendSuccess } from '../utils/api-response';

export const listPaymentCards = async (_req: Request, res: Response): Promise<void> => {
  sendSuccess(res, await paymentCardService.listPaymentCards());
};

export const createPaymentCard = async (req: Request, res: Response): Promise<void> => {
  const body = validated<PaymentCardWriteRequest>(req, 'body');

  sendSuccess(res, await paymentCardService.createPaymentCard(body), 201);
};

export const updatePaymentCard = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<PaymentCardParams>(req, 'params');
  const body = validated<PaymentCardWriteRequest>(req, 'body');

  sendSuccess(res, await paymentCardService.updatePaymentCard(id, body));
};
