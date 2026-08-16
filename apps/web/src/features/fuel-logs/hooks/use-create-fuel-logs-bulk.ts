'use client';

import type { FuelLogBulkWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createFuelLogsBulk } from '@/features/fuel-logs/api/fuel-logs-api';
import { invalidateFuelLogQueries } from '@/features/fuel-logs/hooks/invalidate-fuel-logs';
import { getApiErrorMessage } from '@/lib/api-error';

export const useCreateFuelLogsBulk = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: FuelLogBulkWriteRequest) => createFuelLogsBulk(body),
    onSuccess: async (fuelLogs) => {
      toast.success(
        fuelLogs.length === 1 ? 'Sipanje je dodato.' : `Dodato je ${fuelLogs.length} sipanja.`,
      );
      await invalidateFuelLogQueries(queryClient);
    },
    onError: (error) => {
      toast.error('Grupni unos nije sačuvan.', { description: getApiErrorMessage(error) });
    },
  });
};
