import type {
  ApiPaginatedResponse,
  ApiResponse,
  DeleteDriverResult,
  DriverAccessLinkCreatedDto,
  DriverAccessLinkDto,
  DriverDto,
  DriverStatusOverviewDto,
  DriverWriteRequest,
  PaginationMeta,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';
import type { DriverListQueryParams } from '@/lib/query-keys';

export interface DriverListPage {
  drivers: DriverDto[];
  pagination: PaginationMeta;
}

export const fetchDrivers = async (
  params: DriverListQueryParams,
  signal?: AbortSignal,
): Promise<DriverListPage> => {
  const response = await apiClient.get<ApiPaginatedResponse<DriverDto>>('/drivers', {
    params,
    signal,
  });

  return { drivers: response.data.data, pagination: response.data.pagination };
};

export const fetchDriverStatusOverview = async (
  id: string,
  signal?: AbortSignal,
): Promise<DriverStatusOverviewDto> => {
  const response = await apiClient.get<ApiResponse<DriverStatusOverviewDto>>(
    `/drivers/${id}/status-overview`,
    { signal },
  );

  return unwrap(response.data);
};

export const fetchDriver = async (id: string, signal?: AbortSignal): Promise<DriverDto> => {
  const response = await apiClient.get<ApiResponse<DriverDto>>(`/drivers/${id}`, { signal });

  return unwrap(response.data);
};

export const createDriver = async (body: DriverWriteRequest): Promise<DriverDto> => {
  const response = await apiClient.post<ApiResponse<DriverDto>>('/drivers', body);

  return unwrap(response.data);
};

export const updateDriver = async (id: string, body: DriverWriteRequest): Promise<DriverDto> => {
  const response = await apiClient.patch<ApiResponse<DriverDto>>(`/drivers/${id}`, body);

  return unwrap(response.data);
};

export const deleteDriver = async (id: string): Promise<DeleteDriverResult> => {
  const response = await apiClient.delete<ApiResponse<DeleteDriverResult>>(`/drivers/${id}`);

  return unwrap(response.data);
};

export const fetchDriverAccessLink = async (
  id: string,
  signal?: AbortSignal,
): Promise<DriverAccessLinkDto> => {
  const response = await apiClient.get<ApiResponse<DriverAccessLinkDto>>(
    `/drivers/${id}/access-link`,
    { signal },
  );

  return unwrap(response.data);
};

export const createDriverAccessLink = async (id: string): Promise<DriverAccessLinkCreatedDto> => {
  const response = await apiClient.post<ApiResponse<DriverAccessLinkCreatedDto>>(
    `/drivers/${id}/access-link`,
  );

  return unwrap(response.data);
};

export const revokeDriverAccessLink = async (id: string): Promise<DriverAccessLinkDto> => {
  const response = await apiClient.delete<ApiResponse<DriverAccessLinkDto>>(
    `/drivers/${id}/access-link`,
  );

  return unwrap(response.data);
};
