import type {
  ApiResponse,
  DeleteFuelLogResult,
  FuelLogDto,
  FuelLogWriteRequest,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';
import type { FuelLogListQueryParams } from '@/lib/query-keys';

export const fetchFuelLogs = async (
  vehicleId: string,
  params: FuelLogListQueryParams | undefined,
  signal?: AbortSignal,
): Promise<FuelLogDto[]> => {
  const response = await apiClient.get<ApiResponse<FuelLogDto[]>>(
    `/vehicles/${vehicleId}/fuel-logs`,
    { params, signal },
  );

  return unwrap(response.data);
};

export const createFuelLog = async (
  vehicleId: string,
  body: FuelLogWriteRequest,
): Promise<FuelLogDto> => {
  const response = await apiClient.post<ApiResponse<FuelLogDto>>(
    `/vehicles/${vehicleId}/fuel-logs`,
    body,
  );

  return unwrap(response.data);
};

export const updateFuelLog = async (
  vehicleId: string,
  fuelLogId: string,
  body: FuelLogWriteRequest,
): Promise<FuelLogDto> => {
  const response = await apiClient.patch<ApiResponse<FuelLogDto>>(
    `/vehicles/${vehicleId}/fuel-logs/${fuelLogId}`,
    body,
  );

  return unwrap(response.data);
};

export const deleteFuelLog = async (
  vehicleId: string,
  fuelLogId: string,
): Promise<DeleteFuelLogResult> => {
  const response = await apiClient.delete<ApiResponse<DeleteFuelLogResult>>(
    `/vehicles/${vehicleId}/fuel-logs/${fuelLogId}`,
  );

  return unwrap(response.data);
};
