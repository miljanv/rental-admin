'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchTachographCalibrations } from '@/features/tachograph-calibrations/api/tachograph-calibrations-api';
import { queryKeys } from '@/lib/query-keys';

export const useTachographCalibrations = (vehicleId: string) =>
  useQuery({
    queryKey: queryKeys.vehicles.calibrations(vehicleId),
    queryFn: ({ signal }) => fetchTachographCalibrations(vehicleId, signal),
    enabled: vehicleId.length > 0,
  });
