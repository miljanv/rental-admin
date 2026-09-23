import type {
  ApiResponse,
  CompanyExpenseDto,
  CompanyExpenseSummaryDto,
  CompanyExpenseWriteRequest,
  DeleteCompanyExpenseResult,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';
import type {
  CompanyExpenseListQueryParams,
  CompanyExpenseSummaryParams,
} from '@/lib/query-keys';

export const fetchCompanyExpenses = async (
  params: CompanyExpenseListQueryParams | undefined,
  signal?: AbortSignal,
): Promise<CompanyExpenseDto[]> => {
  const response = await apiClient.get<ApiResponse<CompanyExpenseDto[]>>('/expenses', {
    params,
    signal,
  });

  return unwrap(response.data);
};

export const fetchVehicleCompanyExpenses = async (
  vehicleId: string,
  params: CompanyExpenseListQueryParams | undefined,
  signal?: AbortSignal,
): Promise<CompanyExpenseDto[]> => {
  const response = await apiClient.get<ApiResponse<CompanyExpenseDto[]>>(
    `/vehicles/${vehicleId}/expenses`,
    { params, signal },
  );

  return unwrap(response.data);
};

export const fetchCompanyExpenseSummary = async (
  params: CompanyExpenseSummaryParams | undefined,
  signal?: AbortSignal,
): Promise<CompanyExpenseSummaryDto> => {
  const response = await apiClient.get<ApiResponse<CompanyExpenseSummaryDto>>(
    '/expenses/summary',
    { params, signal },
  );

  return unwrap(response.data);
};

export const createCompanyExpense = async (
  body: CompanyExpenseWriteRequest,
): Promise<CompanyExpenseDto> => {
  const response = await apiClient.post<ApiResponse<CompanyExpenseDto>>('/expenses', body);

  return unwrap(response.data);
};

export const updateCompanyExpense = async (
  expenseId: string,
  body: CompanyExpenseWriteRequest,
): Promise<CompanyExpenseDto> => {
  const response = await apiClient.patch<ApiResponse<CompanyExpenseDto>>(
    `/expenses/${expenseId}`,
    body,
  );

  return unwrap(response.data);
};

export const deleteCompanyExpense = async (
  expenseId: string,
): Promise<DeleteCompanyExpenseResult> => {
  const response = await apiClient.delete<ApiResponse<DeleteCompanyExpenseResult>>(
    `/expenses/${expenseId}`,
  );

  return unwrap(response.data);
};
