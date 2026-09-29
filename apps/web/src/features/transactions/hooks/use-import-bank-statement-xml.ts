'use client';

import type { BankStatementXmlImportRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { importBankStatementXml } from '@/features/transactions/api/transactions-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useImportBankStatementXml = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: BankStatementXmlImportRequest) => importBankStatementXml(body),
    onSuccess: async (result) => {
      toast.success('Izvod je uvezen.', {
        description: `Novo dodato: ${result.imported}. Već postoji: ${result.duplicateSkipped}. Neispravno: ${result.invalidSkipped}. Kupci: ${result.matchedPartners}. Dobavljači: ${result.matchedSuppliers}.`,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    },
    onError: (error) => {
      toast.error('Izvod nije uvezen.', { description: getApiErrorMessage(error) });
    },
  });
};
