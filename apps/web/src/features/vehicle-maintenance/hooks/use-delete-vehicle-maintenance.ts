'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deleteVehicleMaintenance } from '@/features/vehicle-maintenance/api/vehicle-maintenance-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useDeleteVehicleMaintenance = (vehicleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { maintenanceId: string; label: string }) =>
      deleteVehicleMaintenance(vehicleId, variables.maintenanceId),
    onSuccess: async (_result, variables) => {
      toast.success('Zapis je obrisan.', { description: variables.label });
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
    },
    onError: (error) => {
      toast.error('Zapis nije obrisan.', { description: getApiErrorMessage(error) });
    },
  });
};
