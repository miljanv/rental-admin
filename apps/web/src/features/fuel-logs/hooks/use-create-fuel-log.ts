'use client';

import type { FuelLogWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createFuelLog } from '@/features/fuel-logs/api/fuel-logs-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useCreateFuelLog = (vehicleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: FuelLogWriteRequest) => createFuelLog(vehicleId, body),
    onSuccess: async () => {
      toast.success('Točenje je dodato.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all }),
      ]);
    },
    onError: (error) => {
      toast.error('Točenje nije sačuvano.', { description: getApiErrorMessage(error) });
    },
  });
};
