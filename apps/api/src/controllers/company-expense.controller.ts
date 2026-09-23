import type {
  CompanyExpenseIdParams,
  CompanyExpenseParams,
  CompanyExpenseSummaryQuery,
  CompanyExpenseWriteRequest,
  ListCompanyExpensesQuery,
  VehicleIdParams,
} from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as companyExpenseService from '../services/company-expense.service';
import { sendSuccess } from '../utils/api-response';

export const listCompanyExpenses = async (req: Request, res: Response): Promise<void> => {
  const query = validated<ListCompanyExpensesQuery>(req, 'query');
  const expenses = await companyExpenseService.listCompanyExpenses(query);

  sendSuccess(res, expenses);
};

export const listVehicleCompanyExpenses = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<VehicleIdParams>(req, 'params');
  const query = validated<ListCompanyExpensesQuery>(req, 'query');
  const expenses = await companyExpenseService.listVehicleCompanyExpenses(id, query);

  sendSuccess(res, expenses);
};

export const getCompanyExpense = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<CompanyExpenseIdParams>(req, 'params');
  const expense = await companyExpenseService.getCompanyExpense(id);

  sendSuccess(res, expense);
};

export const getVehicleCompanyExpense = async (req: Request, res: Response): Promise<void> => {
  const { id, expenseId } = validated<CompanyExpenseParams>(req, 'params');
  const expense = await companyExpenseService.getCompanyExpense(expenseId, id);

  sendSuccess(res, expense);
};

export const createCompanyExpense = async (req: Request, res: Response): Promise<void> => {
  const body = validated<CompanyExpenseWriteRequest>(req, 'body');
  const expense = await companyExpenseService.createCompanyExpense(body);

  sendSuccess(res, expense, 201);
};

export const updateCompanyExpense = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<CompanyExpenseIdParams>(req, 'params');
  const body = validated<CompanyExpenseWriteRequest>(req, 'body');
  const expense = await companyExpenseService.updateCompanyExpense(id, body);

  sendSuccess(res, expense);
};

export const deleteCompanyExpense = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<CompanyExpenseIdParams>(req, 'params');
  const result = await companyExpenseService.deleteCompanyExpense(id);

  sendSuccess(res, result);
};

export const getCompanyExpenseSummary = async (req: Request, res: Response): Promise<void> => {
  const query = validated<CompanyExpenseSummaryQuery>(req, 'query');
  const summary = await companyExpenseService.getCompanyExpenseSummary(query);

  sendSuccess(res, summary);
};

export const listCompanyExpenseSuppliers = async (_req: Request, res: Response): Promise<void> => {
  const suppliers = await companyExpenseService.listCompanyExpenseSuppliers();

  sendSuccess(res, suppliers);
};
