import type {
  ApiResponse,
  DeleteVehicleDocumentResult,
  VehicleDocumentDto,
  VehicleDocumentWriteRequest,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';

export const fetchVehicleDocuments = async (
  vehicleId: string,
  signal?: AbortSignal,
): Promise<VehicleDocumentDto[]> => {
  const response = await apiClient.get<ApiResponse<VehicleDocumentDto[]>>(
    `/vehicles/${vehicleId}/documents`,
    { signal },
  );

  return unwrap(response.data);
};

export const createVehicleDocument = async (
  vehicleId: string,
  body: VehicleDocumentWriteRequest,
): Promise<VehicleDocumentDto> => {
  const response = await apiClient.post<ApiResponse<VehicleDocumentDto>>(
    `/vehicles/${vehicleId}/documents`,
    body,
  );

  return unwrap(response.data);
};

export const updateVehicleDocument = async (
  vehicleId: string,
  documentId: string,
  body: VehicleDocumentWriteRequest,
): Promise<VehicleDocumentDto> => {
  const response = await apiClient.patch<ApiResponse<VehicleDocumentDto>>(
    `/vehicles/${vehicleId}/documents/${documentId}`,
    body,
  );

  return unwrap(response.data);
};

export const deleteVehicleDocument = async (
  vehicleId: string,
  documentId: string,
): Promise<DeleteVehicleDocumentResult> => {
  const response = await apiClient.delete<ApiResponse<DeleteVehicleDocumentResult>>(
    `/vehicles/${vehicleId}/documents/${documentId}`,
  );

  return unwrap(response.data);
};
