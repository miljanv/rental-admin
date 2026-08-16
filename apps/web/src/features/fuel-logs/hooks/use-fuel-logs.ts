'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchFuelLogs, fetchVehicleFuelLogs } from '@/features/fuel-logs/api/fuel-logs-api';
import { queryKeys, type FuelLogListQueryParams } from '@/lib/query-keys';

export const useFuelLogs = (params?: FuelLogListQueryParams) =>
  useQuery({
    queryKey: queryKeys.fuelLogs.list(params),
    queryFn: ({ signal }) => fetchFuelLogs(params, signal),
    placeholderData: (previous) => previous,
  });

export const useVehicleFuelLogs = (vehicleId: string, params?: FuelLogListQueryParams) =>
  useQuery({
    queryKey: queryKeys.vehicles.fuelLogs(vehicleId, params),
    queryFn: ({ signal }) => fetchVehicleFuelLogs(vehicleId, params, signal),
    enabled: vehicleId.length > 0,
    placeholderData: (previous) => previous,
  });
