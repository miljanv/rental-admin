'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchAlarmThresholds } from '@/features/alarms/api/alarms-api';
import { queryKeys } from '@/lib/query-keys';

export const useAlarmThresholds = () =>
  useQuery({
    queryKey: queryKeys.alarms.thresholds(),
    queryFn: ({ signal }) => fetchAlarmThresholds(signal),
  });
