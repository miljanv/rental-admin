'use client';

import type { BankStatementXmlImportRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { importBankStatementXml } from '@/features/transactions/api/transactions-api';
import { getApiErrorMessage, parseApiError } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useImportBankStatementXml = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: BankStatementXmlImportRequest) => importBankStatementXml(body),
    onSuccess: (result) => {
      toast.success('Izvod je uvezen.', {
        description: `Novo dodato: ${result.imported}. Već postoji: ${result.duplicateSkipped}. Neispravno: ${result.invalidSkipped}. Kupci: ${result.matchedPartners}. Dobavljači: ${result.matchedSuppliers}. Rasknjiženo: ${result.allocated}. Čeka raspoređivanje: ${result.unallocated}.`,
      });
    },
    onError: (error) => {
      const parsed = parseApiError(error);

      if (parsed.isNetworkError || (parsed.status !== undefined && parsed.status >= 500)) {
        toast.error('Status uvoza nije potvrđen.', {
          description:
            'Odgovor servera nije dobijen ili obrada nije završena. Deo stavki je možda već uvezen, a obrada može još trajati. Sačekajte i osvežite evidenciju pre ponovnog uvoza.',
        });
        return;
      }

      toast.error('Uvoz izvoda nije završen.', { description: getApiErrorMessage(error) });
    },
    // Rows are committed individually, so a failed request can still have saved data.
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.trips.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.companyExpenses.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.partners.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all }),
      ]);
    },
  });
};
