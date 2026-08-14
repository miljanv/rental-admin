'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deleteTachographCalibration } from '@/features/tachograph-calibrations/api/tachograph-calibrations-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useDeleteTachographCalibration = (vehicleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { calibrationId: string; label: string }) =>
      deleteTachographCalibration(vehicleId, variables.calibrationId),
    onSuccess: async (_result, variables) => {
      toast.success('Kalibracija je obrisana.', { description: variables.label });
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
    },
    onError: (error) => {
      toast.error('Kalibracija nije obrisana.', { description: getApiErrorMessage(error) });
    },
  });
};
