'use client';

import type { TachographCalibrationWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createTachographCalibration } from '@/features/tachograph-calibrations/api/tachograph-calibrations-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useCreateTachographCalibration = (vehicleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: TachographCalibrationWriteRequest) =>
      createTachographCalibration(vehicleId, body),
    onSuccess: async () => {
      toast.success('Kalibracija je dodata.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
    },
    onError: (error) => {
      toast.error('Kalibracija nije sačuvana.', { description: getApiErrorMessage(error) });
    },
  });
};
