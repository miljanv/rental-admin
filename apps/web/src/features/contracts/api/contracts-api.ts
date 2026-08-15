import type {
  ApiPaginatedResponse,
  ApiResponse,
  ContractAvailabilityResult,
  ContractDto,
  ContractStatusChangeRequest,
  ContractWriteRequest,
  DeleteContractResult,
  PaginationMeta,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';
import type { ContractAvailabilityParams, ContractListQueryParams } from '@/lib/query-keys';

export interface ContractListPage {
  contracts: ContractDto[];
  pagination: PaginationMeta;
}

export const fetchContracts = async (
  params: ContractListQueryParams,
  signal?: AbortSignal,
): Promise<ContractListPage> => {
  const response = await apiClient.get<ApiPaginatedResponse<ContractDto>>('/contracts', {
    params,
    signal,
  });

  return { contracts: response.data.data, pagination: response.data.pagination };
};

export const fetchContract = async (id: string, signal?: AbortSignal): Promise<ContractDto> => {
  const response = await apiClient.get<ApiResponse<ContractDto>>(`/contracts/${id}`, { signal });

  return unwrap(response.data);
};

export const createContract = async (body: ContractWriteRequest): Promise<ContractDto> => {
  const response = await apiClient.post<ApiResponse<ContractDto>>('/contracts', body);

  return unwrap(response.data);
};

export const updateContract = async (
  id: string,
  body: ContractWriteRequest,
): Promise<ContractDto> => {
  const response = await apiClient.patch<ApiResponse<ContractDto>>(`/contracts/${id}`, body);

  return unwrap(response.data);
};

export const changeContractStatus = async (
  id: string,
  body: ContractStatusChangeRequest,
): Promise<ContractDto> => {
  const response = await apiClient.patch<ApiResponse<ContractDto>>(`/contracts/${id}/status`, body);

  return unwrap(response.data);
};

export const deleteContract = async (id: string): Promise<DeleteContractResult> => {
  const response = await apiClient.delete<ApiResponse<DeleteContractResult>>(`/contracts/${id}`);

  return unwrap(response.data);
};

export const checkContractAvailability = async (
  params: ContractAvailabilityParams,
  signal?: AbortSignal,
): Promise<ContractAvailabilityResult> => {
  const response = await apiClient.get<ApiResponse<ContractAvailabilityResult>>(
    '/contracts/availability',
    { params, signal },
  );

  return unwrap(response.data);
};
