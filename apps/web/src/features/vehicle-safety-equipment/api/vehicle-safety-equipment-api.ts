import type {
  ApiResponse,
  DeleteVehicleSafetyEquipmentResult,
  ExpiringVehicleSafetyEquipmentDto,
  VehicleSafetyEquipmentDto,
  VehicleSafetyEquipmentWriteRequest,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';

export const fetchVehicleSafetyEquipment = async (
  vehicleId: string,
  signal?: AbortSignal,
): Promise<VehicleSafetyEquipmentDto[]> => {
  const response = await apiClient.get<ApiResponse<VehicleSafetyEquipmentDto[]>>(
    `/vehicles/${vehicleId}/safety-equipment`,
    { signal },
  );

  return unwrap(response.data);
};

export const createVehicleSafetyEquipment = async (
  vehicleId: string,
  body: VehicleSafetyEquipmentWriteRequest,
): Promise<VehicleSafetyEquipmentDto> => {
  const response = await apiClient.post<ApiResponse<VehicleSafetyEquipmentDto>>(
    `/vehicles/${vehicleId}/safety-equipment`,
    body,
  );

  return unwrap(response.data);
};

export const updateVehicleSafetyEquipment = async (
  vehicleId: string,
  equipmentId: string,
  body: VehicleSafetyEquipmentWriteRequest,
): Promise<VehicleSafetyEquipmentDto> => {
  const response = await apiClient.patch<ApiResponse<VehicleSafetyEquipmentDto>>(
    `/vehicles/${vehicleId}/safety-equipment/${equipmentId}`,
    body,
  );

  return unwrap(response.data);
};

export const deleteVehicleSafetyEquipment = async (
  vehicleId: string,
  equipmentId: string,
): Promise<DeleteVehicleSafetyEquipmentResult> => {
  const response = await apiClient.delete<ApiResponse<DeleteVehicleSafetyEquipmentResult>>(
    `/vehicles/${vehicleId}/safety-equipment/${equipmentId}`,
  );

  return unwrap(response.data);
};

export const fetchExpiringSafetyEquipment = async (
  days: number,
  signal?: AbortSignal,
): Promise<ExpiringVehicleSafetyEquipmentDto[]> => {
  const response = await apiClient.get<ApiResponse<ExpiringVehicleSafetyEquipmentDto[]>>(
    '/vehicles/expiring-safety-equipment',
    { params: { days }, signal },
  );

  return unwrap(response.data);
};
