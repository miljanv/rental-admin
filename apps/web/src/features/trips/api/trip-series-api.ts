import type {
  ApiResponse,
  BulkUpdateTripSeriesRequest,
  BulkUpdateTripSeriesResult,
  GenerateTripSeriesRequest,
  GenerateTripSeriesResult,
  TerminateTripSeriesRequest,
  TerminateTripSeriesResult,
  TripDto,
  TripSeriesDto,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';

export const generateTripSeries = async (
  body: GenerateTripSeriesRequest,
): Promise<GenerateTripSeriesResult> => {
  const response = await apiClient.post<ApiResponse<GenerateTripSeriesResult>>(
    '/trips/series/generate',
    body,
  );

  return unwrap(response.data);
};

export interface TripSeriesDetail {
  series: TripSeriesDto;
  trips: TripDto[];
}

export const fetchTripSeries = async (
  id: string,
  signal?: AbortSignal,
): Promise<TripSeriesDetail> => {
  const response = await apiClient.get<ApiResponse<TripSeriesDetail>>(`/trips/series/${id}`, {
    signal,
  });

  return unwrap(response.data);
};

export const bulkUpdateTripSeries = async (
  id: string,
  body: BulkUpdateTripSeriesRequest,
): Promise<BulkUpdateTripSeriesResult> => {
  const response = await apiClient.patch<ApiResponse<BulkUpdateTripSeriesResult>>(
    `/trips/series/${id}/bulk-update`,
    body,
  );

  return unwrap(response.data);
};

export const terminateTripSeries = async (
  id: string,
  body: TerminateTripSeriesRequest,
): Promise<TerminateTripSeriesResult> => {
  const response = await apiClient.post<ApiResponse<TerminateTripSeriesResult>>(
    `/trips/series/${id}/terminate`,
    body,
  );

  return unwrap(response.data);
};
