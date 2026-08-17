import type {
  ApiResponse,
  GeneratedTripBillingDocumentResult,
  TripBillingDocumentDto,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';

export const fetchTripBillingDocuments = async (
  tripId: string,
  signal?: AbortSignal,
): Promise<TripBillingDocumentDto[]> => {
  const response = await apiClient.get<ApiResponse<TripBillingDocumentDto[]>>(
    `/trips/${tripId}/billing-documents`,
    { signal },
  );

  return unwrap(response.data);
};

export const generatePredracun = async (
  tripId: string,
): Promise<GeneratedTripBillingDocumentResult> => {
  const response = await apiClient.post<ApiResponse<GeneratedTripBillingDocumentResult>>(
    `/trips/${tripId}/billing-documents/predracun`,
  );

  return unwrap(response.data);
};

export const generateRacun = async (
  tripId: string,
): Promise<GeneratedTripBillingDocumentResult> => {
  const response = await apiClient.post<ApiResponse<GeneratedTripBillingDocumentResult>>(
    `/trips/${tripId}/billing-documents/racun`,
  );

  return unwrap(response.data);
};
