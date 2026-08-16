'use client';

import type { FuelLogCreateRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createFuelLog } from '@/features/fuel-logs/api/fuel-logs-api';
import { invalidateFuelLogQueries } from '@/features/fuel-logs/hooks/invalidate-fuel-logs';
import { getApiErrorMessage } from '@/lib/api-error';

export const useCreateFuelLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: FuelLogCreateRequest) => createFuelLog(body),
    onSuccess: async () => {
      toast.success('Sipanje je dodato.');
      await invalidateFuelLogQueries(queryClient);
    },
    onError: (error) => {
      toast.error('Sipanje nije sačuvano.', { description: getApiErrorMessage(error) });
    },
  });
};
