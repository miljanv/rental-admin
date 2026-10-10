'use client';

import type { BankStatementXmlImportRequest } from '@rental-admin/shared';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { previewBankStatementXml } from '@/features/transactions/api/transactions-api';
import { getApiErrorMessage } from '@/lib/api-error';

export const usePreviewBankStatementXml = () =>
  useMutation({
    mutationFn: (body: BankStatementXmlImportRequest) => previewBankStatementXml(body),
    onError: (error) => {
      toast.error('Izvod nije analiziran.', { description: getApiErrorMessage(error) });
    },
  });
