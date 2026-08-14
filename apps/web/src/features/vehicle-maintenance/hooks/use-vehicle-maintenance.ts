'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchVehicleMaintenance } from '@/features/vehicle-maintenance/api/vehicle-maintenance-api';
import { queryKeys } from '@/lib/query-keys';

export const useVehicleMaintenance = (vehicleId: string) =>
  useQuery({
    queryKey: queryKeys.vehicles.maintenance(vehicleId),
    queryFn: ({ signal }) => fetchVehicleMaintenance(vehicleId, signal),
    enabled: vehicleId.length > 0,
  });
