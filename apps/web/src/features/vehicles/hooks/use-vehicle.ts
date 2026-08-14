'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchVehicle } from '@/features/vehicles/api/vehicles-api';
import { queryKeys } from '@/lib/query-keys';

export const useVehicle = (id: string) =>
  useQuery({
    queryKey: queryKeys.vehicles.detail(id),
    queryFn: ({ signal }) => fetchVehicle(id, signal),
    enabled: id.length > 0,
  });
