'use client';

import type { TachographCalibrationWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { updateTachographCalibration } from '@/features/tachograph-calibrations/api/tachograph-calibrations-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useUpdateTachographCalibration = (vehicleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { calibrationId: string; body: TachographCalibrationWriteRequest }) =>
      updateTachographCalibration(vehicleId, variables.calibrationId, variables.body),
    onSuccess: async () => {
      toast.success('Kalibracija je izmenjena.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
    },
    onError: (error) => {
      toast.error('Izmene nisu sačuvane.', { description: getApiErrorMessage(error) });
    },
  });
};
