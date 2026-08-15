'use client';

import type { VehicleSafetyEquipmentWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { updateVehicleSafetyEquipment } from '@/features/vehicle-safety-equipment/api/vehicle-safety-equipment-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useUpdateVehicleSafetyEquipment = (vehicleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { equipmentId: string; body: VehicleSafetyEquipmentWriteRequest }) =>
      updateVehicleSafetyEquipment(vehicleId, variables.equipmentId, variables.body),
    onSuccess: async () => {
      toast.success('Oprema je izmenjena.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    },
    onError: (error) => {
      toast.error('Izmene nisu sačuvane.', { description: getApiErrorMessage(error) });
    },
  });
};
