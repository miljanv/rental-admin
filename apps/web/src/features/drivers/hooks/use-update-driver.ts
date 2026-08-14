'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { updateDriver } from '@/features/drivers/api/drivers-api';
import { driverFullName } from '@/features/drivers/lib/driver';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useUpdateDriver = (id: string) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (body: Parameters<typeof updateDriver>[1]) => updateDriver(id, body),
    onSuccess: async (driver) => {
      toast.success('Izmene su sačuvane.', { description: driverFullName(driver) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });
      router.push(`/drivers/${driver.id}`);
    },
    onError: (error) => {
      toast.error('Izmene nisu sačuvane.', { description: getApiErrorMessage(error) });
    },
  });
};
