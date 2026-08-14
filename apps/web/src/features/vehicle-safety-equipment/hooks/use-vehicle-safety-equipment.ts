'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchVehicleSafetyEquipment } from '@/features/vehicle-safety-equipment/api/vehicle-safety-equipment-api';
import { queryKeys } from '@/lib/query-keys';

export const useVehicleSafetyEquipment = (vehicleId: string) =>
  useQuery({
    queryKey: queryKeys.vehicles.safetyEquipment(vehicleId),
    queryFn: ({ signal }) => fetchVehicleSafetyEquipment(vehicleId, signal),
    enabled: vehicleId.length > 0,
  });
