'use client';
import type { CounterpartyRequest } from '@rental-admin/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as api from '../api/settlement-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

const useFinanceMutation = <TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  message: string,
) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      toast.success(message);
      await Promise.all(
        [
          queryKeys.openingBalances.all,
          queryKeys.transactions.all,
          queryKeys.partners.all,
          queryKeys.suppliers.all,
          queryKeys.trips.all,
          queryKeys.companyExpenses.all,
          queryKeys.dashboard.all,
          queryKeys.analytics.all,
        ].map((queryKey) => client.invalidateQueries({ queryKey })),
      );
    },
    onError: (error) =>
      toast.error('Promena nije sačuvana.', { description: getApiErrorMessage(error) }),
  });
};
export const useOpeningBalances = (party: CounterpartyRequest) =>
  useQuery({
    queryKey: queryKeys.openingBalances.list(party),
    queryFn: ({ signal }) => api.fetchOpeningBalances(party, signal),
  });
export const useSaveOpeningBalance = () =>
  useFinanceMutation(api.saveOpeningBalance, 'Nacrt je sačuvan.');
export const useConfirmOpeningBalance = () =>
  useFinanceMutation(api.confirmOpeningBalance, 'Početno stanje je potvrđeno.');
export const useReverseOpeningBalance = () =>
  useFinanceMutation(api.reverseOpeningBalance, 'Početno stanje je stornirano.');
export const useLinkCounterparty = () =>
  useFinanceMutation(api.linkCounterparty, 'Stranka je povezana sa uplatom.');
export const useConfirmAllocationPlan = () =>
  useFinanceMutation(api.confirmAllocationPlan, 'Raspored je sačuvan.');
export const useReverseAllocation = () =>
  useFinanceMutation(api.reverseAllocation, 'Povezivanje je poništeno.');
export const useAllocationPlan = () =>
  useMutation({
    mutationFn: api.previewAllocationPlan,
    onError: (error) =>
      toast.error('Predlog nije učitan.', { description: getApiErrorMessage(error) }),
  });
export const usePaymentAllocations = (id: string) =>
  useQuery({
    queryKey: queryKeys.transactions.allocations(id),
    queryFn: ({ signal }) => api.fetchPaymentAllocations(id, signal),
  });
