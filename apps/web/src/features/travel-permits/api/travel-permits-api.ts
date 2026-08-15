import type {
  ApiResponse,
  DeleteTravelPermitResult,
  TravelPermitDto,
  TravelPermitWriteRequest,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';

export const fetchTravelPermits = async (
  contractId: string,
  signal?: AbortSignal,
): Promise<TravelPermitDto[]> => {
  const response = await apiClient.get<ApiResponse<TravelPermitDto[]>>(
    `/contracts/${contractId}/travel-permits`,
    { signal },
  );

  return unwrap(response.data);
};

export const createTravelPermit = async (
  contractId: string,
  body: TravelPermitWriteRequest,
): Promise<TravelPermitDto> => {
  const response = await apiClient.post<ApiResponse<TravelPermitDto>>(
    `/contracts/${contractId}/travel-permits`,
    body,
  );

  return unwrap(response.data);
};

export const updateTravelPermit = async (
  contractId: string,
  permitId: string,
  body: TravelPermitWriteRequest,
): Promise<TravelPermitDto> => {
  const response = await apiClient.patch<ApiResponse<TravelPermitDto>>(
    `/contracts/${contractId}/travel-permits/${permitId}`,
    body,
  );

  return unwrap(response.data);
};

export const deleteTravelPermit = async (
  contractId: string,
  permitId: string,
): Promise<DeleteTravelPermitResult> => {
  const response = await apiClient.delete<ApiResponse<DeleteTravelPermitResult>>(
    `/contracts/${contractId}/travel-permits/${permitId}`,
  );

  return unwrap(response.data);
};
