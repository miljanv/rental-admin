import type {
  ApiPaginatedResponse,
  ApiResponse,
  DeleteVehicleResult,
  PaginationMeta,
  VehicleDto,
  VehicleWriteRequest,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';
import type { VehicleListQueryParams } from '@/lib/query-keys';

export interface VehicleListPage {
  vehicles: VehicleDto[];
  pagination: PaginationMeta;
}

export const fetchVehicles = async (
  params: VehicleListQueryParams,
  signal?: AbortSignal,
): Promise<VehicleListPage> => {
  const response = await apiClient.get<ApiPaginatedResponse<VehicleDto>>('/vehicles', {
    params,
    signal,
  });

  return { vehicles: response.data.data, pagination: response.data.pagination };
};

export const fetchVehicle = async (id: string, signal?: AbortSignal): Promise<VehicleDto> => {
  const response = await apiClient.get<ApiResponse<VehicleDto>>(`/vehicles/${id}`, { signal });

  return unwrap(response.data);
};

export const createVehicle = async (body: VehicleWriteRequest): Promise<VehicleDto> => {
  const response = await apiClient.post<ApiResponse<VehicleDto>>('/vehicles', body);

  return unwrap(response.data);
};

export const updateVehicle = async (
  id: string,
  body: VehicleWriteRequest,
): Promise<VehicleDto> => {
  const response = await apiClient.patch<ApiResponse<VehicleDto>>(`/vehicles/${id}`, body);

  return unwrap(response.data);
};

export const deleteVehicle = async (id: string): Promise<DeleteVehicleResult> => {
  const response = await apiClient.delete<ApiResponse<DeleteVehicleResult>>(`/vehicles/${id}`);

  return unwrap(response.data);
};
