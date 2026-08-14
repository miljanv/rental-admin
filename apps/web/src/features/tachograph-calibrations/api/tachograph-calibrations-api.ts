import type {
  ApiResponse,
  DeleteTachographCalibrationResult,
  ExpiringTachographCalibrationDto,
  TachographCalibrationDto,
  TachographCalibrationWriteRequest,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';

export const fetchTachographCalibrations = async (
  vehicleId: string,
  signal?: AbortSignal,
): Promise<TachographCalibrationDto[]> => {
  const response = await apiClient.get<ApiResponse<TachographCalibrationDto[]>>(
    `/vehicles/${vehicleId}/calibrations`,
    { signal },
  );

  return unwrap(response.data);
};

export const createTachographCalibration = async (
  vehicleId: string,
  body: TachographCalibrationWriteRequest,
): Promise<TachographCalibrationDto> => {
  const response = await apiClient.post<ApiResponse<TachographCalibrationDto>>(
    `/vehicles/${vehicleId}/calibrations`,
    body,
  );

  return unwrap(response.data);
};

export const updateTachographCalibration = async (
  vehicleId: string,
  calibrationId: string,
  body: TachographCalibrationWriteRequest,
): Promise<TachographCalibrationDto> => {
  const response = await apiClient.patch<ApiResponse<TachographCalibrationDto>>(
    `/vehicles/${vehicleId}/calibrations/${calibrationId}`,
    body,
  );

  return unwrap(response.data);
};

export const deleteTachographCalibration = async (
  vehicleId: string,
  calibrationId: string,
): Promise<DeleteTachographCalibrationResult> => {
  const response = await apiClient.delete<ApiResponse<DeleteTachographCalibrationResult>>(
    `/vehicles/${vehicleId}/calibrations/${calibrationId}`,
  );

  return unwrap(response.data);
};

export const fetchExpiringCalibrations = async (
  days: number,
  signal?: AbortSignal,
): Promise<ExpiringTachographCalibrationDto[]> => {
  const response = await apiClient.get<ApiResponse<ExpiringTachographCalibrationDto[]>>(
    '/vehicles/expiring-calibrations',
    { params: { days }, signal },
  );

  return unwrap(response.data);
};
