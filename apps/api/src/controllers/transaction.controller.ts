import type {
  FinanceExportQueryRequest,
  FinanceReportQueryRequest,
  ListTransactionsQuery,
  SettleAdvancesRequest,
  TransactionIdParams,
  TransactionWriteRequest,
  UnsettledAdvancesQuery,
} from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as transactionService from '../services/transaction.service';
import { sendPaginated, sendSuccess } from '../utils/api-response';
import { buildContentDisposition } from '../utils/storage-key';

export const listTransactions = async (req: Request, res: Response): Promise<void> => {
  const query = validated<ListTransactionsQuery>(req, 'query');
  const { transactions, pagination } = await transactionService.listTransactions(query);

  sendPaginated(res, transactions, pagination);
};

export const listUnsettledAdvances = async (req: Request, res: Response): Promise<void> => {
  const query = validated<UnsettledAdvancesQuery>(req, 'query');
  const result = await transactionService.listUnsettledAdvances(query);

  sendSuccess(res, result);
};

export const getFinanceReport = async (req: Request, res: Response): Promise<void> => {
  const query = validated<FinanceReportQueryRequest>(req, 'query');
  const report = await transactionService.getFinanceReport(query);

  sendSuccess(res, report);
};

export const exportFinanceReport = async (req: Request, res: Response): Promise<void> => {
  const query = validated<FinanceExportQueryRequest>(req, 'query');
  const file = await transactionService.exportFinanceReport(query);

  res.status(200);
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', buildContentDisposition(file.fileName));
  res.setHeader('Content-Length', String(file.buffer.length));
  res.end(file.buffer);
};

export const settleAdvances = async (req: Request, res: Response): Promise<void> => {
  const body = validated<SettleAdvancesRequest>(req, 'body');
  const result = await transactionService.settleAdvances(body);

  sendSuccess(res, result, 201);
};

export const getTransaction = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<TransactionIdParams>(req, 'params');
  const transaction = await transactionService.getTransaction(id);

  sendSuccess(res, transaction);
};

export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  const body = validated<TransactionWriteRequest>(req, 'body');
  const transaction = await transactionService.createTransaction(body);

  sendSuccess(res, transaction, 201);
};

export const updateTransaction = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<TransactionIdParams>(req, 'params');
  const body = validated<TransactionWriteRequest>(req, 'body');
  const transaction = await transactionService.updateTransaction(id, body);

  sendSuccess(res, transaction);
};

export const deleteTransaction = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<TransactionIdParams>(req, 'params');
  const result = await transactionService.deleteTransaction(id);

  sendSuccess(res, result);
};
