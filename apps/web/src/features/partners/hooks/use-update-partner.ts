'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { updatePartner } from '@/features/partners/api/partners-api';
import { partnerLabel } from '@/features/partners/lib/partner';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useUpdatePartner = (id: string) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (body: Parameters<typeof updatePartner>[1]) => updatePartner(id, body),
    onSuccess: async (partner) => {
      toast.success('Izmene su sačuvane.', { description: partnerLabel(partner) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.partners.all });
      router.push('/partners');
    },
    onError: (error) => {
      toast.error('Izmene nisu sačuvane.', { description: getApiErrorMessage(error) });
    },
  });
};
