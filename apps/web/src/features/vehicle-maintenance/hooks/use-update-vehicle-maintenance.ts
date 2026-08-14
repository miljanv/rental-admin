'use client';

import type { VehicleMaintenanceWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { updateVehicleMaintenance } from '@/features/vehicle-maintenance/api/vehicle-maintenance-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useUpdateVehicleMaintenance = (vehicleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { maintenanceId: string; body: VehicleMaintenanceWriteRequest }) =>
      updateVehicleMaintenance(vehicleId, variables.maintenanceId, variables.body),
    onSuccess: async () => {
      toast.success('Izmene su sačuvane.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
    },
    onError: (error) => {
      toast.error('Izmene nisu sačuvane.', { description: getApiErrorMessage(error) });
    },
  });
};
