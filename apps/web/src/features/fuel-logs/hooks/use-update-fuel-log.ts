'use client';

import type { FuelLogWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { updateFuelLog } from '@/features/fuel-logs/api/fuel-logs-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useUpdateFuelLog = (vehicleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { fuelLogId: string; body: FuelLogWriteRequest }) =>
      updateFuelLog(vehicleId, variables.fuelLogId, variables.body),
    onSuccess: async () => {
      toast.success('Izmene su sačuvane.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
    },
    onError: (error) => {
      toast.error('Izmene nisu sačuvane.', { description: getApiErrorMessage(error) });
    },
  });
};
