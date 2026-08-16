'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchFuelSuppliers } from '@/features/fuel-logs/api/fuel-logs-api';
import { queryKeys } from '@/lib/query-keys';

export const useFuelSuppliers = () =>
  useQuery({
    queryKey: queryKeys.fuelLogs.suppliers(),
    queryFn: ({ signal }) => fetchFuelSuppliers(signal),
    placeholderData: (previous) => previous,
  });
