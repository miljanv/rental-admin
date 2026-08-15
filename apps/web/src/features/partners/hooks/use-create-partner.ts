'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { createPartner } from '@/features/partners/api/partners-api';
import { partnerLabel } from '@/features/partners/lib/partner';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

interface UseCreatePartnerOptions {
  /** Off inside the contract wizard, where creating a partner is one step, not a whole page. */
  redirect?: boolean;
}

export const useCreatePartner = ({ redirect = true }: UseCreatePartnerOptions = {}) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: createPartner,
    onSuccess: async (partner) => {
      toast.success('Partner je dodat.', { description: partnerLabel(partner) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.partners.all });

      if (redirect) {
        router.push('/partners');
      }
    },
    onError: (error) => {
      toast.error('Partner nije sačuvan.', { description: getApiErrorMessage(error) });
    },
  });
};
