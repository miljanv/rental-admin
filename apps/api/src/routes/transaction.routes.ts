import { Router } from 'express';
import {
  allocationIdParamsSchema,
  allocationPlanSchema,
  confirmAllocationPlanSchema,
  financeIdParamsSchema,
  financeReasonSchema,
  linkCounterpartySchema,
} from '@rental-admin/shared';
import * as settlementController from '../controllers/finance-settlement.controller';

import * as transactionController from '../controllers/transaction.controller';
import { validateRequest } from '../middleware/validate-request';
import {
  bankStatementEntryWriteSchema,
  bankStatementXmlImportSchema,
  financeExportQuerySchema,
  financeReportQuerySchema,
  listSettlementTargetsQuerySchema,
  listTransactionsQuerySchema,
  paymentAllocationWriteSchema,
  settleAdvancesSchema,
  transactionIdParamsSchema,
  transactionWriteSchema,
  unsettledAdvancesQuerySchema,
} from '../schemas/transaction.schema';
import { asyncHandler } from '../utils/async-handler';

export const transactionRouter = Router();

transactionRouter.get(
  '/',
  validateRequest({ query: listTransactionsQuerySchema }),
  asyncHandler(transactionController.listTransactions),
);

transactionRouter.post(
  '/',
  validateRequest({ body: transactionWriteSchema }),
  asyncHandler(transactionController.createTransaction),
);

transactionRouter.post(
  '/bank-statements',
  validateRequest({ body: bankStatementEntryWriteSchema }),
  asyncHandler(transactionController.createBankStatementEntry),
);

transactionRouter.post(
  '/bank-statements/preview-xml',
  validateRequest({ body: bankStatementXmlImportSchema }),
  asyncHandler(transactionController.previewBankStatementXml),
);

transactionRouter.post(
  '/bank-statements/import-xml',
  validateRequest({ body: bankStatementXmlImportSchema }),
  asyncHandler(transactionController.importBankStatementXml),
);

transactionRouter.get(
  '/unsettled-advances',
  validateRequest({ query: unsettledAdvancesQuerySchema }),
  asyncHandler(transactionController.listUnsettledAdvances),
);

transactionRouter.get(
  '/settlement-targets',
  validateRequest({ query: listSettlementTargetsQuerySchema }),
  asyncHandler(transactionController.listSettlementTargets),
);

transactionRouter.get(
  '/reports',
  validateRequest({ query: financeReportQuerySchema }),
  asyncHandler(transactionController.getFinanceReport),
);

transactionRouter.get(
  '/reports/vat',
  validateRequest({ query: financeReportQuerySchema }),
  asyncHandler(transactionController.getVatReport),
);

transactionRouter.get(
  '/reports/export',
  validateRequest({ query: financeExportQuerySchema }),
  asyncHandler(transactionController.exportFinanceReport),
);

transactionRouter.post(
  '/settle-advances',
  validateRequest({ body: settleAdvancesSchema }),
  asyncHandler(transactionController.settleAdvances),
);

transactionRouter.patch(
  '/bank-statements/:id',
  validateRequest({ params: transactionIdParamsSchema, body: bankStatementEntryWriteSchema }),
  asyncHandler(transactionController.updateBankStatementEntry),
);

transactionRouter.post(
  '/:id/allocations',
  validateRequest({ params: transactionIdParamsSchema, body: paymentAllocationWriteSchema }),
  asyncHandler(transactionController.createPaymentAllocation),
);

transactionRouter.get(
  '/:id',
  validateRequest({ params: transactionIdParamsSchema }),
  asyncHandler(transactionController.getTransaction),
);

transactionRouter.patch(
  '/:id',
  validateRequest({ params: transactionIdParamsSchema, body: transactionWriteSchema }),
  asyncHandler(transactionController.updateTransaction),
);

transactionRouter.delete(
  '/:id',
  validateRequest({ params: transactionIdParamsSchema }),
  asyncHandler(transactionController.deleteTransaction),
);

transactionRouter.patch(
  '/:id/counterparty',
  validateRequest({ params: financeIdParamsSchema, body: linkCounterpartySchema }),
  asyncHandler(settlementController.linkCounterparty),
);
transactionRouter.post(
  '/:id/allocation-plan',
  validateRequest({ params: financeIdParamsSchema, body: allocationPlanSchema }),
  asyncHandler(settlementController.previewAllocation),
);
transactionRouter.post(
  '/:id/allocate-oldest',
  validateRequest({ params: financeIdParamsSchema, body: confirmAllocationPlanSchema }),
  asyncHandler(settlementController.confirmAllocation),
);
transactionRouter.get(
  '/:id/allocations',
  validateRequest({ params: financeIdParamsSchema }),
  asyncHandler(settlementController.listAllocations),
);
transactionRouter.post(
  '/:id/allocations/:allocationId/reverse',
  validateRequest({ params: allocationIdParamsSchema, body: financeReasonSchema }),
  asyncHandler(settlementController.reverseAllocation),
);
