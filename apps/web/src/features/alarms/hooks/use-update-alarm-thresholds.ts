'use client';

import type { AlarmThresholdsWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { updateAlarmThresholds } from '@/features/alarms/api/alarms-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useUpdateAlarmThresholds = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: AlarmThresholdsWriteRequest) => updateAlarmThresholds(body),
    onSuccess: async () => {
      toast.success('Pragovi upozorenja su sačuvani.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.alarms.all });
    },
    onError: (error) => {
      toast.error('Pragovi nisu sačuvani.', { description: getApiErrorMessage(error) });
    },
  });
};
