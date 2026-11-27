import {
  DRIVER_ACCESS_HEADER,
  type ApiResponse,
  type DriverFuelEntryCreateRequest,
  type DriverFuelEntryDto,
  type DriverPortalToolCreateRequest,
  type DriverPortalVehicleOptionDto,
  type DriverToolDto,
  type DriverToolLostRequest,
  type VehicleFaultCreateRequest,
  type VehicleFaultDto,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';

const withToken = (token: string, signal?: AbortSignal) => ({
  headers: { [DRIVER_ACCESS_HEADER]: token },
  signal,
});

const get = async <T>(token: string, path: string, signal?: AbortSignal): Promise<T> => {
  const response = await apiClient.get<ApiResponse<T>>(path, withToken(token, signal));

  return unwrap(response.data);
};

const post = async <T>(token: string, path: string, body?: unknown): Promise<T> => {
  const response = await apiClient.post<ApiResponse<T>>(path, body ?? {}, withToken(token));

  return unwrap(response.data);
};

export const fetchPortalVehicles = (token: string, signal?: AbortSignal) =>
  get<DriverPortalVehicleOptionDto[]>(token, '/driver-portal/vehicles', signal);

export const fetchPortalFaults = (token: string, signal?: AbortSignal) =>
  get<VehicleFaultDto[]>(token, '/driver-portal/faults', signal);

export const reportPortalFault = (token: string, input: VehicleFaultCreateRequest) =>
  post<VehicleFaultDto>(token, '/driver-portal/faults', input);

export const fetchPortalTools = (token: string, signal?: AbortSignal) =>
  get<DriverToolDto[]>(token, '/driver-portal/tools', signal);

export const addPortalTool = (token: string, input: DriverPortalToolCreateRequest) =>
  post<DriverToolDto[]>(token, '/driver-portal/tools', input);

export const confirmAllPortalTools = (token: string) =>
  post<DriverToolDto[]>(token, '/driver-portal/tools/confirm-all');

export const respondToPortalTool = (token: string, toolId: string, action: 'CONFIRM' | 'DECLINE') =>
  post<DriverToolDto[]>(token, `/driver-portal/tools/${encodeURIComponent(toolId)}/respond`, {
    action,
  });

export const reportPortalToolLost = (token: string, toolId: string, input: DriverToolLostRequest) =>
  post<DriverToolDto[]>(token, `/driver-portal/tools/${encodeURIComponent(toolId)}/lost`, input);

export const fetchPortalFuelEntries = (token: string, signal?: AbortSignal) =>
  get<DriverFuelEntryDto[]>(token, '/driver-portal/fuel-entries', signal);

export const submitPortalFuelEntry = (token: string, input: DriverFuelEntryCreateRequest) =>
  post<DriverFuelEntryDto>(token, '/driver-portal/fuel-entries', input);
