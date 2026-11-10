'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createDriverAccessLink } from '@/features/drivers/api/drivers-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useCreateDriverAccessLink = (driverId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => createDriverAccessLink(driverId),
    onSuccess: async () => {
      toast.success('Link za vozača je napravljen.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.drivers.accessLink(driverId) });
    },
    onError: (error) => {
      toast.error('Link nije napravljen.', { description: getApiErrorMessage(error) });
    },
  });
};
