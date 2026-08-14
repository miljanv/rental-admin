'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchVehicles } from '@/features/vehicles/api/vehicles-api';
import { queryKeys, type VehicleListQueryParams } from '@/lib/query-keys';

export const useVehicles = (params: VehicleListQueryParams) =>
  useQuery({
    queryKey: queryKeys.vehicles.list(params),
    queryFn: ({ signal }) => fetchVehicles(params, signal),
    placeholderData: (previous) => previous,
  });
