import type {
  ApiPaginatedResponse,
  ApiResponse,
  DeletePartnerResult,
  PaginationMeta,
  PartnerDto,
  PartnerWriteRequest,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';
import type { PartnerListQueryParams } from '@/lib/query-keys';

export interface PartnerListPage {
  partners: PartnerDto[];
  pagination: PaginationMeta;
}

export const fetchPartners = async (
  params: PartnerListQueryParams,
  signal?: AbortSignal,
): Promise<PartnerListPage> => {
  const response = await apiClient.get<ApiPaginatedResponse<PartnerDto>>('/partners', {
    params,
    signal,
  });

  return { partners: response.data.data, pagination: response.data.pagination };
};

export const fetchPartner = async (id: string, signal?: AbortSignal): Promise<PartnerDto> => {
  const response = await apiClient.get<ApiResponse<PartnerDto>>(`/partners/${id}`, { signal });

  return unwrap(response.data);
};

export const createPartner = async (body: PartnerWriteRequest): Promise<PartnerDto> => {
  const response = await apiClient.post<ApiResponse<PartnerDto>>('/partners', body);

  return unwrap(response.data);
};

export const updatePartner = async (id: string, body: PartnerWriteRequest): Promise<PartnerDto> => {
  const response = await apiClient.patch<ApiResponse<PartnerDto>>(`/partners/${id}`, body);

  return unwrap(response.data);
};

export const deletePartner = async (id: string): Promise<DeletePartnerResult> => {
  const response = await apiClient.delete<ApiResponse<DeletePartnerResult>>(`/partners/${id}`);

  return unwrap(response.data);
};
