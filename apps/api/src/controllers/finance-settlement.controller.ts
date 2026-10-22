import type { Request, Response } from 'express';
import type {
  AllocationPlanRequest,
  ConfirmAllocationPlanRequest,
  CounterpartyRequest,
  LinkCounterpartyRequest,
  OpeningBalanceWriteRequest,
} from '@rental-admin/shared';
import { validated } from '../middleware/validate-request';
import { sendSuccess } from '../utils/api-response';
import * as opening from '../services/opening-balance.service';
import * as settlement from '../services/payment-settlement.service';

const requestId = (req: Request): string => validated<{ id: string }>(req, 'params').id;
export const listOpeningBalances = async (req: Request, res: Response): Promise<void> => {
  sendSuccess(res, await opening.listOpeningBalances(validated<CounterpartyRequest>(req, 'query')));
};
export const createOpeningBalance = async (req: Request, res: Response): Promise<void> => {
  sendSuccess(
    res,
    await opening.saveOpeningBalance(validated<OpeningBalanceWriteRequest>(req, 'body')),
    201,
  );
};
export const updateOpeningBalance = async (req: Request, res: Response): Promise<void> => {
  sendSuccess(
    res,
    await opening.saveOpeningBalance(
      validated<OpeningBalanceWriteRequest>(req, 'body'),
      requestId(req),
    ),
  );
};
export const confirmOpeningBalance = async (req: Request, res: Response): Promise<void> => {
  sendSuccess(res, await opening.confirmOpeningBalance(requestId(req)));
};
export const reverseOpeningBalance = async (req: Request, res: Response): Promise<void> => {
  sendSuccess(
    res,
    await opening.reverseOpeningBalance(
      requestId(req),
      validated<{ reason: string }>(req, 'body').reason,
    ),
  );
};
export const linkCounterparty = async (req: Request, res: Response): Promise<void> => {
  sendSuccess(
    res,
    await settlement.linkPaymentCounterparty(
      requestId(req),
      validated<LinkCounterpartyRequest>(req, 'body'),
    ),
  );
};
export const previewAllocation = async (req: Request, res: Response): Promise<void> => {
  sendSuccess(
    res,
    await settlement.previewPaymentAllocation(
      requestId(req),
      validated<AllocationPlanRequest>(req, 'body'),
    ),
  );
};
export const confirmAllocation = async (req: Request, res: Response): Promise<void> => {
  sendSuccess(
    res,
    await settlement.confirmPaymentAllocation(
      requestId(req),
      validated<ConfirmAllocationPlanRequest>(req, 'body'),
    ),
  );
};
export const listAllocations = async (req: Request, res: Response): Promise<void> => {
  sendSuccess(res, await settlement.listPaymentAllocations(requestId(req)));
};
export const reverseAllocation = async (req: Request, res: Response): Promise<void> => {
  const { id, allocationId } = validated<{ id: string; allocationId: string }>(req, 'params');
  sendSuccess(
    res,
    await settlement.reversePaymentAllocation(
      id,
      allocationId,
      validated<{ reason: string }>(req, 'body').reason,
    ),
  );
};
