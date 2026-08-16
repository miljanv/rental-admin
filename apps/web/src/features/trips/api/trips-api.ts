import type {
  ApiPaginatedResponse,
  ApiResponse,
  DeleteTripExpenseResult,
  DeleteTripResult,
  PaginationMeta,
  TripDto,
  TripExpenseDto,
  TripExpenseWriteRequest,
  TripSettlementDto,
  TripSettlementWriteRequest,
  TripStatsDto,
  TripWriteRequest,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';
import type { TripListQueryParams, TripStatsParams } from '@/lib/query-keys';

export interface TripListPage {
  trips: TripDto[];
  pagination: PaginationMeta;
}

export const fetchTrips = async (
  params: TripListQueryParams,
  signal?: AbortSignal,
): Promise<TripListPage> => {
  const response = await apiClient.get<ApiPaginatedResponse<TripDto>>('/trips', { params, signal });

  return { trips: response.data.data, pagination: response.data.pagination };
};

export const fetchTrip = async (id: string, signal?: AbortSignal): Promise<TripDto> => {
  const response = await apiClient.get<ApiResponse<TripDto>>(`/trips/${id}`, { signal });

  return unwrap(response.data);
};

export const createTrip = async (body: TripWriteRequest): Promise<TripDto> => {
  const response = await apiClient.post<ApiResponse<TripDto>>('/trips', body);

  return unwrap(response.data);
};

export const updateTrip = async (id: string, body: TripWriteRequest): Promise<TripDto> => {
  const response = await apiClient.patch<ApiResponse<TripDto>>(`/trips/${id}`, body);

  return unwrap(response.data);
};

export const deleteTrip = async (id: string): Promise<DeleteTripResult> => {
  const response = await apiClient.delete<ApiResponse<DeleteTripResult>>(`/trips/${id}`);

  return unwrap(response.data);
};

export const fetchTripStats = async (
  params: TripStatsParams,
  signal?: AbortSignal,
): Promise<TripStatsDto> => {
  const response = await apiClient.get<ApiResponse<TripStatsDto>>('/trips/stats', { params, signal });

  return unwrap(response.data);
};

export const fetchTripSettlement = async (
  tripId: string,
  signal?: AbortSignal,
): Promise<TripSettlementDto> => {
  const response = await apiClient.get<ApiResponse<TripSettlementDto>>(`/trips/${tripId}/settlement`, {
    signal,
  });

  return unwrap(response.data);
};

export const updateTripSettlement = async (
  tripId: string,
  body: TripSettlementWriteRequest,
): Promise<TripSettlementDto> => {
  const response = await apiClient.patch<ApiResponse<TripSettlementDto>>(
    `/trips/${tripId}/settlement`,
    body,
  );

  return unwrap(response.data);
};

export const createTripExpense = async (
  tripId: string,
  body: TripExpenseWriteRequest,
): Promise<TripExpenseDto> => {
  const response = await apiClient.post<ApiResponse<TripExpenseDto>>(`/trips/${tripId}/expenses`, body);

  return unwrap(response.data);
};

export const updateTripExpense = async (
  tripId: string,
  expenseId: string,
  body: TripExpenseWriteRequest,
): Promise<TripExpenseDto> => {
  const response = await apiClient.patch<ApiResponse<TripExpenseDto>>(
    `/trips/${tripId}/expenses/${expenseId}`,
    body,
  );

  return unwrap(response.data);
};

export const deleteTripExpense = async (
  tripId: string,
  expenseId: string,
): Promise<DeleteTripExpenseResult> => {
  const response = await apiClient.delete<ApiResponse<DeleteTripExpenseResult>>(
    `/trips/${tripId}/expenses/${expenseId}`,
  );

  return unwrap(response.data);
};
