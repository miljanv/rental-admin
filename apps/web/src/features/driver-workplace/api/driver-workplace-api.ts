import type {
  ApiResponse,
  DriverFuelEntryDto,
  DriverFuelEntryReviewRequest,
  DriverFuelEntryStatus,
  DriverToolAttentionDto,
  DriverToolDto,
  DriverToolOfficeActionRequest,
  DriverToolWriteRequest,
  DriverWorkplacePendingDto,
  VehicleFaultDto,
  VehicleFaultStatus,
  VehicleFaultUpdateRequest,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';

export const fetchVehicleFaults = async (
  status: VehicleFaultStatus | undefined,
  signal?: AbortSignal,
): Promise<VehicleFaultDto[]> => {
  const response = await apiClient.get<ApiResponse<VehicleFaultDto[]>>('/driver-workplace/faults', {
    params: status ? { status } : {},
    signal,
  });

  return unwrap(response.data);
};

export const updateVehicleFault = async (
  id: string,
  input: VehicleFaultUpdateRequest,
): Promise<VehicleFaultDto> => {
  const response = await apiClient.patch<ApiResponse<VehicleFaultDto>>(
    `/driver-workplace/faults/${encodeURIComponent(id)}`,
    input,
  );

  return unwrap(response.data);
};

export const fetchDriverFuelEntries = async (
  status: DriverFuelEntryStatus | undefined,
  signal?: AbortSignal,
): Promise<DriverFuelEntryDto[]> => {
  const response = await apiClient.get<ApiResponse<DriverFuelEntryDto[]>>(
    '/driver-workplace/fuel-entries',
    { params: status ? { status } : {}, signal },
  );

  return unwrap(response.data);
};

export const reviewDriverFuelEntry = async (
  id: string,
  input: DriverFuelEntryReviewRequest,
): Promise<DriverFuelEntryDto> => {
  const response = await apiClient.post<ApiResponse<DriverFuelEntryDto>>(
    `/driver-workplace/fuel-entries/${encodeURIComponent(id)}/review`,
    input,
  );

  return unwrap(response.data);
};

export const fetchWorkplacePending = async (
  signal?: AbortSignal,
): Promise<DriverWorkplacePendingDto> => {
  const response = await apiClient.get<ApiResponse<DriverWorkplacePendingDto>>(
    '/driver-workplace/pending-count',
    { signal },
  );

  return unwrap(response.data);
};

const toolsPath = (driverId: string, toolId?: string): string =>
  `/drivers/${encodeURIComponent(driverId)}/tools${toolId ? `/${encodeURIComponent(toolId)}` : ''}`;

export const fetchDriverTools = async (
  driverId: string,
  signal?: AbortSignal,
): Promise<DriverToolDto[]> => {
  const response = await apiClient.get<ApiResponse<DriverToolDto[]>>(toolsPath(driverId), {
    signal,
  });

  return unwrap(response.data);
};

export const createDriverTool = async (
  driverId: string,
  input: DriverToolWriteRequest,
): Promise<DriverToolDto> => {
  const response = await apiClient.post<ApiResponse<DriverToolDto>>(toolsPath(driverId), input);

  return unwrap(response.data);
};

export const updateDriverTool = async (
  driverId: string,
  toolId: string,
  input: DriverToolWriteRequest,
): Promise<DriverToolDto> => {
  const response = await apiClient.put<ApiResponse<DriverToolDto>>(
    toolsPath(driverId, toolId),
    input,
  );

  return unwrap(response.data);
};

export const applyDriverToolAction = async (
  driverId: string,
  toolId: string,
  input: DriverToolOfficeActionRequest,
): Promise<DriverToolDto> => {
  const response = await apiClient.post<ApiResponse<DriverToolDto>>(
    `${toolsPath(driverId, toolId)}/action`,
    input,
  );

  return unwrap(response.data);
};

export const deleteDriverTool = async (driverId: string, toolId: string): Promise<void> => {
  await apiClient.delete(toolsPath(driverId, toolId));
};

export const fetchToolsNeedingOffice = async (
  signal?: AbortSignal,
): Promise<DriverToolAttentionDto[]> => {
  const response = await apiClient.get<ApiResponse<DriverToolAttentionDto[]>>(
    '/driver-workplace/tools',
    { signal },
  );

  return unwrap(response.data);
};
