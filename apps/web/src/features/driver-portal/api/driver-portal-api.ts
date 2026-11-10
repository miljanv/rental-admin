import {
  DRIVER_ACCESS_HEADER,
  type ApiResponse,
  type DriverPortalFileDto,
  type DriverPortalMeDto,
  type DriverPortalReportResultDto,
  type DriverPortalTripDto,
  type DriverPortalTripListDto,
  type DriverPortalUploadDto,
  type DriverReportWriteRequest,
  type PresignUploadRequest,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';

/** Every portal call carries the driver's link token instead of a session. */
const withToken = (token: string, signal?: AbortSignal) => ({
  headers: { [DRIVER_ACCESS_HEADER]: token },
  signal,
});

export const fetchPortalMe = async (
  token: string,
  signal?: AbortSignal,
): Promise<DriverPortalMeDto> => {
  const response = await apiClient.get<ApiResponse<DriverPortalMeDto>>(
    '/driver-portal/me',
    withToken(token, signal),
  );

  return unwrap(response.data);
};

export const fetchPortalTrips = async (
  token: string,
  signal?: AbortSignal,
): Promise<DriverPortalTripListDto> => {
  const response = await apiClient.get<ApiResponse<DriverPortalTripListDto>>(
    '/driver-portal/trips',
    withToken(token, signal),
  );

  return unwrap(response.data);
};

export const fetchPortalTrip = async (
  token: string,
  tripId: string,
  signal?: AbortSignal,
): Promise<DriverPortalTripDto> => {
  const response = await apiClient.get<ApiResponse<DriverPortalTripDto>>(
    `/driver-portal/trips/${encodeURIComponent(tripId)}`,
    withToken(token, signal),
  );

  return unwrap(response.data);
};

export const submitPortalReport = async (
  token: string,
  tripId: string,
  body: DriverReportWriteRequest,
): Promise<DriverPortalReportResultDto> => {
  const response = await apiClient.put<ApiResponse<DriverPortalReportResultDto>>(
    `/driver-portal/trips/${encodeURIComponent(tripId)}/report`,
    body,
    withToken(token),
  );

  return unwrap(response.data);
};

export const presignReceipt = async (
  token: string,
  body: PresignUploadRequest,
  signal?: AbortSignal,
): Promise<DriverPortalUploadDto> => {
  const response = await apiClient.post<ApiResponse<DriverPortalUploadDto>>(
    '/driver-portal/uploads/presign',
    body,
    withToken(token, signal),
  );

  return unwrap(response.data);
};

export const confirmReceipt = async (
  token: string,
  fileId: string,
): Promise<DriverPortalFileDto> => {
  const response = await apiClient.post<ApiResponse<DriverPortalFileDto>>(
    `/driver-portal/uploads/${encodeURIComponent(fileId)}/confirm`,
    undefined,
    withToken(token),
  );

  return unwrap(response.data);
};
