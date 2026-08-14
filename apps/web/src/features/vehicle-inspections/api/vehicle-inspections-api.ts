import type {
  ApiResponse,
  DeleteVehicleInspectionResult,
  ExpiringVehicleInspectionDto,
  VehicleInspectionDto,
  VehicleInspectionWriteRequest,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';

export const fetchVehicleInspections = async (
  vehicleId: string,
  signal?: AbortSignal,
): Promise<VehicleInspectionDto[]> => {
  const response = await apiClient.get<ApiResponse<VehicleInspectionDto[]>>(
    `/vehicles/${vehicleId}/inspections`,
    { signal },
  );

  return unwrap(response.data);
};

export const createVehicleInspection = async (
  vehicleId: string,
  body: VehicleInspectionWriteRequest,
): Promise<VehicleInspectionDto> => {
  const response = await apiClient.post<ApiResponse<VehicleInspectionDto>>(
    `/vehicles/${vehicleId}/inspections`,
    body,
  );

  return unwrap(response.data);
};

export const updateVehicleInspection = async (
  vehicleId: string,
  inspectionId: string,
  body: VehicleInspectionWriteRequest,
): Promise<VehicleInspectionDto> => {
  const response = await apiClient.patch<ApiResponse<VehicleInspectionDto>>(
    `/vehicles/${vehicleId}/inspections/${inspectionId}`,
    body,
  );

  return unwrap(response.data);
};

export const deleteVehicleInspection = async (
  vehicleId: string,
  inspectionId: string,
): Promise<DeleteVehicleInspectionResult> => {
  const response = await apiClient.delete<ApiResponse<DeleteVehicleInspectionResult>>(
    `/vehicles/${vehicleId}/inspections/${inspectionId}`,
  );

  return unwrap(response.data);
};

export const fetchExpiringInspections = async (
  days: number,
  signal?: AbortSignal,
): Promise<ExpiringVehicleInspectionDto[]> => {
  const response = await apiClient.get<ApiResponse<ExpiringVehicleInspectionDto[]>>(
    '/vehicles/expiring-inspections',
    { params: { days }, signal },
  );

  return unwrap(response.data);
};
