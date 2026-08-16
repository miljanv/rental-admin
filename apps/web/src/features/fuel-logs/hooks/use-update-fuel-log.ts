'use client';

import type { FuelLogCreateRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { updateFuelLog } from '@/features/fuel-logs/api/fuel-logs-api';
import { invalidateFuelLogQueries } from '@/features/fuel-logs/hooks/invalidate-fuel-logs';
import { getApiErrorMessage } from '@/lib/api-error';

export const useUpdateFuelLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { fuelLogId: string; body: FuelLogCreateRequest }) =>
      updateFuelLog(variables.fuelLogId, variables.body),
    onSuccess: async () => {
      toast.success('Izmene su sačuvane.');
      await invalidateFuelLogQueries(queryClient);
    },
    onError: (error) => {
      toast.error('Izmene nisu sačuvane.', { description: getApiErrorMessage(error) });
    },
  });
};
