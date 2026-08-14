'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchVehicleInspections } from '@/features/vehicle-inspections/api/vehicle-inspections-api';
import { queryKeys } from '@/lib/query-keys';

export const useVehicleInspections = (vehicleId: string) =>
  useQuery({
    queryKey: queryKeys.vehicles.inspections(vehicleId),
    queryFn: ({ signal }) => fetchVehicleInspections(vehicleId, signal),
    enabled: vehicleId.length > 0,
  });
