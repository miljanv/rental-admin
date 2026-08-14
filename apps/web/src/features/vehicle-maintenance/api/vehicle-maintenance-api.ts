import type {
  ApiResponse,
  DeleteVehicleMaintenanceResult,
  MaintenanceCostSummaryDto,
  VehicleMaintenanceDto,
  VehicleMaintenanceWriteRequest,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';
import type { MaintenanceCostSummaryParams } from '@/lib/query-keys';

export const fetchVehicleMaintenance = async (
  vehicleId: string,
  signal?: AbortSignal,
): Promise<VehicleMaintenanceDto[]> => {
  const response = await apiClient.get<ApiResponse<VehicleMaintenanceDto[]>>(
    `/vehicles/${vehicleId}/maintenance`,
    { signal },
  );

  return unwrap(response.data);
};

export const createVehicleMaintenance = async (
  vehicleId: string,
  body: VehicleMaintenanceWriteRequest,
): Promise<VehicleMaintenanceDto> => {
  const response = await apiClient.post<ApiResponse<VehicleMaintenanceDto>>(
    `/vehicles/${vehicleId}/maintenance`,
    body,
  );

  return unwrap(response.data);
};

export const updateVehicleMaintenance = async (
  vehicleId: string,
  maintenanceId: string,
  body: VehicleMaintenanceWriteRequest,
): Promise<VehicleMaintenanceDto> => {
  const response = await apiClient.patch<ApiResponse<VehicleMaintenanceDto>>(
    `/vehicles/${vehicleId}/maintenance/${maintenanceId}`,
    body,
  );

  return unwrap(response.data);
};

export const deleteVehicleMaintenance = async (
  vehicleId: string,
  maintenanceId: string,
): Promise<DeleteVehicleMaintenanceResult> => {
  const response = await apiClient.delete<ApiResponse<DeleteVehicleMaintenanceResult>>(
    `/vehicles/${vehicleId}/maintenance/${maintenanceId}`,
  );

  return unwrap(response.data);
};

export const fetchMaintenanceCostSummary = async (
  params: MaintenanceCostSummaryParams | undefined,
  signal?: AbortSignal,
): Promise<MaintenanceCostSummaryDto> => {
  const response = await apiClient.get<ApiResponse<MaintenanceCostSummaryDto>>(
    '/vehicles/maintenance-cost-summary',
    { params, signal },
  );

  return unwrap(response.data);
};
