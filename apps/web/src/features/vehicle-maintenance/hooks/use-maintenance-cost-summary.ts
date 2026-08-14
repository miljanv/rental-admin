'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchMaintenanceCostSummary } from '@/features/vehicle-maintenance/api/vehicle-maintenance-api';
import { queryKeys, type MaintenanceCostSummaryParams } from '@/lib/query-keys';

export const useMaintenanceCostSummary = (params?: MaintenanceCostSummaryParams) =>
  useQuery({
    queryKey: queryKeys.vehicles.maintenanceCostSummary(params),
    queryFn: ({ signal }) => fetchMaintenanceCostSummary(params, signal),
  });
