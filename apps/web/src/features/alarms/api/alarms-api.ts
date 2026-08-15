import type {
  AlarmsDto,
  AlarmThresholdsDto,
  AlarmThresholdsWriteRequest,
  ApiResponse,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';

export const fetchAlarms = async (signal?: AbortSignal): Promise<AlarmsDto> => {
  const response = await apiClient.get<ApiResponse<AlarmsDto>>('/alarms', { signal });

  return unwrap(response.data);
};

export const fetchAlarmThresholds = async (
  signal?: AbortSignal,
): Promise<AlarmThresholdsDto> => {
  const response = await apiClient.get<ApiResponse<AlarmThresholdsDto>>('/alarms/thresholds', {
    signal,
  });

  return unwrap(response.data);
};

export const updateAlarmThresholds = async (
  body: AlarmThresholdsWriteRequest,
): Promise<AlarmThresholdsDto> => {
  const response = await apiClient.patch<ApiResponse<AlarmThresholdsDto>>(
    '/alarms/thresholds',
    body,
  );

  return unwrap(response.data);
};
