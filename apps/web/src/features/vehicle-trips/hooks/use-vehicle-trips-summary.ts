'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchVehicleTripsSummary } from '@/features/vehicle-trips/api/vehicle-trips-api';
import { queryKeys, type VehicleTripsQueryParams } from '@/lib/query-keys';

export const useVehicleTripsSummary = (vehicleId: string, params: VehicleTripsQueryParams) =>
  useQuery({
    queryKey: queryKeys.vehicles.tripsSummary(vehicleId, params),
    queryFn: ({ signal }) => fetchVehicleTripsSummary(vehicleId, params, signal),
    placeholderData: (previous) => previous,
  });
