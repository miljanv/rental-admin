'use client';

import type { PaymentCardWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  createPaymentCard,
  updatePaymentCard,
} from '@/features/payment-cards/api/payment-cards-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

/** Creates a card, or updates one when an id is given. */
export const useSavePaymentCard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: PaymentCardWriteRequest }) =>
      id ? updatePaymentCard({ id, body }) : createPaymentCard(body),
    onSuccess: async () => {
      toast.success('Kartica je sačuvana.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.paymentCards.all });
    },
    onError: (error) => {
      toast.error('Kartica nije sačuvana.', { description: getApiErrorMessage(error) });
    },
  });
};
