import type {
  ApiPaginatedResponse,
  ApiResponse,
  DeleteTransactionResult,
  FinanceReportDto,
  PaginationMeta,
  SettleAdvancesRequest,
  SettleAdvancesResult,
  TransactionDto,
  TransactionWriteRequest,
  UnsettledAdvancesDto,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';
import type { TransactionListQueryParams } from '@/lib/query-keys';

export interface TransactionListPage {
  transactions: TransactionDto[];
  pagination: PaginationMeta;
}

export const fetchTransactions = async (
  params: TransactionListQueryParams,
  signal?: AbortSignal,
): Promise<TransactionListPage> => {
  const response = await apiClient.get<ApiPaginatedResponse<TransactionDto>>('/transactions', {
    params,
    signal,
  });

  return { transactions: response.data.data, pagination: response.data.pagination };
};

export const fetchUnsettledAdvances = async (
  supplier?: string,
  signal?: AbortSignal,
): Promise<UnsettledAdvancesDto> => {
  const response = await apiClient.get<ApiResponse<UnsettledAdvancesDto>>(
    '/transactions/unsettled-advances',
    { params: supplier ? { supplier } : undefined, signal },
  );

  return unwrap(response.data);
};

export const fetchTransaction = async (
  id: string,
  signal?: AbortSignal,
): Promise<TransactionDto> => {
  const response = await apiClient.get<ApiResponse<TransactionDto>>(`/transactions/${id}`, {
    signal,
  });

  return unwrap(response.data);
};

export const createTransaction = async (body: TransactionWriteRequest): Promise<TransactionDto> => {
  const response = await apiClient.post<ApiResponse<TransactionDto>>('/transactions', body);

  return unwrap(response.data);
};

export const updateTransaction = async (
  id: string,
  body: TransactionWriteRequest,
): Promise<TransactionDto> => {
  const response = await apiClient.patch<ApiResponse<TransactionDto>>(`/transactions/${id}`, body);

  return unwrap(response.data);
};

export const deleteTransaction = async (id: string): Promise<DeleteTransactionResult> => {
  const response = await apiClient.delete<ApiResponse<DeleteTransactionResult>>(
    `/transactions/${id}`,
  );

  return unwrap(response.data);
};

export const settleAdvances = async (
  body: SettleAdvancesRequest,
): Promise<SettleAdvancesResult> => {
  const response = await apiClient.post<ApiResponse<SettleAdvancesResult>>(
    '/transactions/settle-advances',
    body,
  );

  return unwrap(response.data);
};

export const fetchFinanceReport = async (
  params: { from?: string; to?: string },
  signal?: AbortSignal,
): Promise<FinanceReportDto> => {
  const response = await apiClient.get<ApiResponse<FinanceReportDto>>('/transactions/reports', {
    params,
    signal,
  });

  return unwrap(response.data);
};
