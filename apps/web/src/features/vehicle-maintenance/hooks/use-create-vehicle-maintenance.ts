'use client';

import type { VehicleMaintenanceWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createVehicleMaintenance } from '@/features/vehicle-maintenance/api/vehicle-maintenance-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useCreateVehicleMaintenance = (vehicleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: VehicleMaintenanceWriteRequest) => createVehicleMaintenance(vehicleId, body),
    onSuccess: async () => {
      toast.success('Zapis je dodat.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    },
    onError: (error) => {
      toast.error('Zapis nije sačuvan.', { description: getApiErrorMessage(error) });
    },
  });
};
