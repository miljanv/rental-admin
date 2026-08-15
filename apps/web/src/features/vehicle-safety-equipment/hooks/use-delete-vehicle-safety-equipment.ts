'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deleteVehicleSafetyEquipment } from '@/features/vehicle-safety-equipment/api/vehicle-safety-equipment-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useDeleteVehicleSafetyEquipment = (vehicleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { equipmentId: string; label: string }) =>
      deleteVehicleSafetyEquipment(vehicleId, variables.equipmentId),
    onSuccess: async (_result, variables) => {
      toast.success('Oprema je obrisana.', { description: variables.label });
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    },
    onError: (error) => {
      toast.error('Oprema nije obrisana.', { description: getApiErrorMessage(error) });
    },
  });
};
