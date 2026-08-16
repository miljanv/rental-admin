'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deleteFuelLog } from '@/features/fuel-logs/api/fuel-logs-api';
import { invalidateFuelLogQueries } from '@/features/fuel-logs/hooks/invalidate-fuel-logs';
import { getApiErrorMessage } from '@/lib/api-error';

export const useDeleteFuelLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { fuelLogId: string; label: string }) =>
      deleteFuelLog(variables.fuelLogId),
    onSuccess: async (_result, variables) => {
      toast.success('Sipanje je obrisano.', { description: variables.label });
      await invalidateFuelLogQueries(queryClient);
    },
    onError: (error) => {
      toast.error('Sipanje nije obrisano.', { description: getApiErrorMessage(error) });
    },
  });
};
