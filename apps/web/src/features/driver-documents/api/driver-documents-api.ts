import type {
  ApiResponse,
  DeleteDriverDocumentResult,
  DriverDocumentDto,
  DriverDocumentWriteRequest,
  ExpiringDriverDocumentDto,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';

export const fetchDriverDocuments = async (
  driverId: string,
  signal?: AbortSignal,
): Promise<DriverDocumentDto[]> => {
  const response = await apiClient.get<ApiResponse<DriverDocumentDto[]>>(
    `/drivers/${driverId}/documents`,
    { signal },
  );

  return unwrap(response.data);
};

export const createDriverDocument = async (
  driverId: string,
  body: DriverDocumentWriteRequest,
): Promise<DriverDocumentDto> => {
  const response = await apiClient.post<ApiResponse<DriverDocumentDto>>(
    `/drivers/${driverId}/documents`,
    body,
  );

  return unwrap(response.data);
};

export const updateDriverDocument = async (
  driverId: string,
  documentId: string,
  body: DriverDocumentWriteRequest,
): Promise<DriverDocumentDto> => {
  const response = await apiClient.patch<ApiResponse<DriverDocumentDto>>(
    `/drivers/${driverId}/documents/${documentId}`,
    body,
  );

  return unwrap(response.data);
};

export const deleteDriverDocument = async (
  driverId: string,
  documentId: string,
): Promise<DeleteDriverDocumentResult> => {
  const response = await apiClient.delete<ApiResponse<DeleteDriverDocumentResult>>(
    `/drivers/${driverId}/documents/${documentId}`,
  );

  return unwrap(response.data);
};

export const fetchExpiringDocuments = async (
  days: number,
  signal?: AbortSignal,
): Promise<ExpiringDriverDocumentDto[]> => {
  const response = await apiClient.get<ApiResponse<ExpiringDriverDocumentDto[]>>(
    '/drivers/expiring-documents',
    { params: { days }, signal },
  );

  return unwrap(response.data);
};
