'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deleteFuelLog } from '@/features/fuel-logs/api/fuel-logs-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useDeleteFuelLog = (vehicleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { fuelLogId: string; label: string }) =>
      deleteFuelLog(vehicleId, variables.fuelLogId),
    onSuccess: async (_result, variables) => {
      toast.success('Točenje je obrisano.', { description: variables.label });
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
    },
    onError: (error) => {
      toast.error('Točenje nije obrisano.', { description: getApiErrorMessage(error) });
    },
  });
};
