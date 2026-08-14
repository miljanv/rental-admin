'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { createDriver } from '@/features/drivers/api/drivers-api';
import { driverFullName } from '@/features/drivers/lib/driver';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useCreateDriver = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: createDriver,
    onSuccess: async (driver) => {
      toast.success('Vozač je dodat.', { description: driverFullName(driver) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });
      router.push(`/drivers/${driver.id}`);
    },
    onError: (error) => {
      toast.error('Vozač nije sačuvan.', { description: getApiErrorMessage(error) });
    },
  });
};
