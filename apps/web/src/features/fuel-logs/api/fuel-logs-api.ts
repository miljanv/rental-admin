import type {
  ApiResponse,
  DeleteFuelLogResult,
  FuelConsumptionHistoryDto,
  FuelLogBulkWriteRequest,
  FuelLogCreateRequest,
  FuelLogDto,
  FuelLogSuppliersDto,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';
import type { FuelConsumptionQueryParams, FuelLogListQueryParams } from '@/lib/query-keys';

export const fetchFuelLogs = async (
  params: FuelLogListQueryParams | undefined,
  signal?: AbortSignal,
): Promise<FuelLogDto[]> => {
  const response = await apiClient.get<ApiResponse<FuelLogDto[]>>('/fuel-logs', {
    params,
    signal,
  });

  return unwrap(response.data);
};

export const fetchVehicleFuelLogs = async (
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

export const fetchFuelConsumption = async (
  params: FuelConsumptionQueryParams,
  signal?: AbortSignal,
): Promise<FuelConsumptionHistoryDto> => {
  const response = await apiClient.get<ApiResponse<FuelConsumptionHistoryDto>>(
    '/fuel-logs/consumption',
    { params, signal },
  );

  return unwrap(response.data);
};

export const fetchFuelSuppliers = async (signal?: AbortSignal): Promise<string[]> => {
  const response = await apiClient.get<ApiResponse<FuelLogSuppliersDto>>('/fuel-logs/suppliers', {
    signal,
  });

  return unwrap(response.data).suppliers;
};

export const createFuelLog = async (body: FuelLogCreateRequest): Promise<FuelLogDto> => {
  const response = await apiClient.post<ApiResponse<FuelLogDto>>('/fuel-logs', body);

  return unwrap(response.data);
};

export const createFuelLogsBulk = async (
  body: FuelLogBulkWriteRequest,
): Promise<FuelLogDto[]> => {
  const response = await apiClient.post<ApiResponse<FuelLogDto[]>>('/fuel-logs/bulk', body);

  return unwrap(response.data);
};

export const updateFuelLog = async (
  fuelLogId: string,
  body: FuelLogCreateRequest,
): Promise<FuelLogDto> => {
  const response = await apiClient.patch<ApiResponse<FuelLogDto>>(`/fuel-logs/${fuelLogId}`, body);

  return unwrap(response.data);
};

export const deleteFuelLog = async (fuelLogId: string): Promise<DeleteFuelLogResult> => {
  const response = await apiClient.delete<ApiResponse<DeleteFuelLogResult>>(
    `/fuel-logs/${fuelLogId}`,
  );

  return unwrap(response.data);
};
