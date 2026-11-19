'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { revokeDriverAccessLink } from '@/features/drivers/api/drivers-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useRevokeDriverAccessLink = (driverId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => revokeDriverAccessLink(driverId),
    onSuccess: async () => {
      toast.success('Pristup vozača je ukinut.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.drivers.accessLink(driverId) });
    },
    onError: (error) => {
      toast.error('Pristup nije ukinut.', { description: getApiErrorMessage(error) });
    },
  });
};
