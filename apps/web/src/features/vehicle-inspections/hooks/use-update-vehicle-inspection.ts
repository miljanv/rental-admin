'use client';

import type { VehicleInspectionWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { updateVehicleInspection } from '@/features/vehicle-inspections/api/vehicle-inspections-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useUpdateVehicleInspection = (vehicleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { inspectionId: string; body: VehicleInspectionWriteRequest }) =>
      updateVehicleInspection(vehicleId, variables.inspectionId, variables.body),
    onSuccess: async () => {
      toast.success('Pregled je izmenjen.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    },
    onError: (error) => {
      toast.error('Izmene nisu sačuvane.', { description: getApiErrorMessage(error) });
    },
  });
};
