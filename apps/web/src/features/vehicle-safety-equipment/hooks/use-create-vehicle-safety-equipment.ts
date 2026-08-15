'use client';

import type { VehicleSafetyEquipmentWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createVehicleSafetyEquipment } from '@/features/vehicle-safety-equipment/api/vehicle-safety-equipment-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useCreateVehicleSafetyEquipment = (vehicleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: VehicleSafetyEquipmentWriteRequest) =>
      createVehicleSafetyEquipment(vehicleId, body),
    onSuccess: async () => {
      toast.success('Oprema je dodata.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    },
    onError: (error) => {
      toast.error('Oprema nije sačuvana.', { description: getApiErrorMessage(error) });
    },
  });
};
