'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchAlarms } from '@/features/alarms/api/alarms-api';
import { queryKeys } from '@/lib/query-keys';

export const useAlarms = () =>
  useQuery({
    queryKey: queryKeys.alarms.list(),
    queryFn: ({ signal }) => fetchAlarms(signal),
  });
