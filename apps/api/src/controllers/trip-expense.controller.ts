import type {
  TripExpenseParams,
  TripExpenseWriteRequest,
  TripIdParams,
  TripSettlementWriteRequest,
} from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as tripExpenseService from '../services/trip-expense.service';
import { sendSuccess } from '../utils/api-response';

export const listTripExpenses = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<TripIdParams>(req, 'params');
  const expenses = await tripExpenseService.listTripExpenses(id);

  sendSuccess(res, expenses);
};

export const createTripExpense = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<TripIdParams>(req, 'params');
  const body = validated<TripExpenseWriteRequest>(req, 'body');
  const expense = await tripExpenseService.createTripExpense(id, body);

  sendSuccess(res, expense, 201);
};

export const updateTripExpense = async (req: Request, res: Response): Promise<void> => {
  const { id, expenseId } = validated<TripExpenseParams>(req, 'params');
  const body = validated<TripExpenseWriteRequest>(req, 'body');
  const expense = await tripExpenseService.updateTripExpense(id, expenseId, body);

  sendSuccess(res, expense);
};

export const deleteTripExpense = async (req: Request, res: Response): Promise<void> => {
  const { id, expenseId } = validated<TripExpenseParams>(req, 'params');
  const result = await tripExpenseService.deleteTripExpense(id, expenseId);

  sendSuccess(res, result);
};

export const getTripSettlement = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<TripIdParams>(req, 'params');
  const settlement = await tripExpenseService.getTripSettlement(id);

  sendSuccess(res, settlement);
};

export const updateTripSettlement = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<TripIdParams>(req, 'params');
  const body = validated<TripSettlementWriteRequest>(req, 'body');
  const settlement = await tripExpenseService.updateTripSettlement(id, body);

  sendSuccess(res, settlement);
};
