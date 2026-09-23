import { Router } from 'express';

import * as companyExpenseController from '../controllers/company-expense.controller';
import { validateRequest } from '../middleware/validate-request';
import {
  companyExpenseIdParamsSchema,
  companyExpenseSummaryQuerySchema,
  companyExpenseWriteSchema,
  listCompanyExpensesQuerySchema,
} from '../schemas/company-expense.schema';
import { asyncHandler } from '../utils/async-handler';

export const companyExpenseRouter = Router();

companyExpenseRouter.get(
  '/',
  validateRequest({ query: listCompanyExpensesQuerySchema }),
  asyncHandler(companyExpenseController.listCompanyExpenses),
);

companyExpenseRouter.post(
  '/',
  validateRequest({ body: companyExpenseWriteSchema }),
  asyncHandler(companyExpenseController.createCompanyExpense),
);

companyExpenseRouter.get(
  '/summary',
  validateRequest({ query: companyExpenseSummaryQuerySchema }),
  asyncHandler(companyExpenseController.getCompanyExpenseSummary),
);

companyExpenseRouter.get('/suppliers', asyncHandler(companyExpenseController.listCompanyExpenseSuppliers));

companyExpenseRouter.get(
  '/:id',
  validateRequest({ params: companyExpenseIdParamsSchema }),
  asyncHandler(companyExpenseController.getCompanyExpense),
);

companyExpenseRouter.patch(
  '/:id',
  validateRequest({ params: companyExpenseIdParamsSchema, body: companyExpenseWriteSchema }),
  asyncHandler(companyExpenseController.updateCompanyExpense),
);

companyExpenseRouter.delete(
  '/:id',
  validateRequest({ params: companyExpenseIdParamsSchema }),
  asyncHandler(companyExpenseController.deleteCompanyExpense),
);
