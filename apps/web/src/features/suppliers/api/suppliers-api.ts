import type {
  ApiPaginatedResponse,
  ApiResponse,
  DeleteSupplierResult,
  PaginationMeta,
  SupplierDto,
  SupplierWriteRequest,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';
import type { SupplierListQueryParams } from '@/lib/query-keys';

export interface SupplierListPage {
  suppliers: SupplierDto[];
  pagination: PaginationMeta;
}

export const fetchSuppliers = async (
  params: SupplierListQueryParams,
  signal?: AbortSignal,
): Promise<SupplierListPage> => {
  const response = await apiClient.get<ApiPaginatedResponse<SupplierDto>>('/suppliers', {
    params,
    signal,
  });

  return { suppliers: response.data.data, pagination: response.data.pagination };
};

export const fetchSupplier = async (id: string, signal?: AbortSignal): Promise<SupplierDto> => {
  const response = await apiClient.get<ApiResponse<SupplierDto>>(`/suppliers/${id}`, { signal });

  return unwrap(response.data);
};

export const createSupplier = async (body: SupplierWriteRequest): Promise<SupplierDto> => {
  const response = await apiClient.post<ApiResponse<SupplierDto>>('/suppliers', body);

  return unwrap(response.data);
};

export const updateSupplier = async (
  id: string,
  body: SupplierWriteRequest,
): Promise<SupplierDto> => {
  const response = await apiClient.patch<ApiResponse<SupplierDto>>(`/suppliers/${id}`, body);

  return unwrap(response.data);
};

export const deleteSupplier = async (id: string): Promise<DeleteSupplierResult> => {
  const response = await apiClient.delete<ApiResponse<DeleteSupplierResult>>(`/suppliers/${id}`);

  return unwrap(response.data);
};
