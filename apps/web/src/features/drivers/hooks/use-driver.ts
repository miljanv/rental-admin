'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchDriver } from '@/features/drivers/api/drivers-api';
import { queryKeys } from '@/lib/query-keys';

export const useDriver = (id: string) =>
  useQuery({
    queryKey: queryKeys.drivers.detail(id),
    queryFn: ({ signal }) => fetchDriver(id, signal),
    enabled: id.length > 0,
  });
