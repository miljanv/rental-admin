import type {
  ApiPaginatedResponse,
  ApiResponse,
  DeleteTripResult,
  PaginationMeta,
  TripDto,
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
