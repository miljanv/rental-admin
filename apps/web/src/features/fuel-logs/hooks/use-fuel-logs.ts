'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchFuelLogs } from '@/features/fuel-logs/api/fuel-logs-api';
import { queryKeys, type FuelLogListQueryParams } from '@/lib/query-keys';

export const useFuelLogs = (vehicleId: string, params?: FuelLogListQueryParams) =>
  useQuery({
    queryKey: queryKeys.vehicles.fuelLogs(vehicleId, params),
    queryFn: ({ signal }) => fetchFuelLogs(vehicleId, params, signal),
    enabled: vehicleId.length > 0,
    placeholderData: (previous) => previous,
  });
