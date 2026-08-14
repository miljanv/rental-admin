'use client';

import type { VehicleInspectionWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createVehicleInspection } from '@/features/vehicle-inspections/api/vehicle-inspections-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useCreateVehicleInspection = (vehicleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: VehicleInspectionWriteRequest) => createVehicleInspection(vehicleId, body),
    onSuccess: async () => {
      toast.success('Pregled je dodat.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
    },
    onError: (error) => {
      toast.error('Pregled nije sačuvan.', { description: getApiErrorMessage(error) });
    },
  });
};
