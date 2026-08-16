'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchFuelConsumption } from '@/features/fuel-logs/api/fuel-logs-api';
import { queryKeys, type FuelConsumptionQueryParams } from '@/lib/query-keys';

export const useFuelConsumption = (params: FuelConsumptionQueryParams) =>
  useQuery({
    queryKey: queryKeys.fuelLogs.consumption(params),
    queryFn: ({ signal }) => fetchFuelConsumption(params, signal),
    enabled: params.vehicleId.length > 0,
    placeholderData: (previous) => previous,
  });
