'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deleteVehicleInspection } from '@/features/vehicle-inspections/api/vehicle-inspections-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useDeleteVehicleInspection = (vehicleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { inspectionId: string; label: string }) =>
      deleteVehicleInspection(vehicleId, variables.inspectionId),
    onSuccess: async (_result, variables) => {
      toast.success('Pregled je obrisan.', { description: variables.label });
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    },
    onError: (error) => {
      toast.error('Pregled nije obrisan.', { description: getApiErrorMessage(error) });
    },
  });
};
