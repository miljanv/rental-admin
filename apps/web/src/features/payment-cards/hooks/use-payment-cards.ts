'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchPaymentCards } from '@/features/payment-cards/api/payment-cards-api';
import { queryKeys } from '@/lib/query-keys';

export const usePaymentCards = () =>
  useQuery({
    queryKey: queryKeys.paymentCards.list(),
    queryFn: ({ signal }) => fetchPaymentCards(signal),
  });
