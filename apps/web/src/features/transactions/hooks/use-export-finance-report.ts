'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  downloadFinanceExport,
  saveFinanceExport,
  type FinanceExportParams,
} from '@/features/transactions/api/finance-export-api';
import { getApiErrorMessage } from '@/lib/api-error';

export const useExportFinanceReport = () =>
  useMutation({
    mutationFn: downloadFinanceExport,
    onSuccess: ({ blob, fileName }) => {
      saveFinanceExport(blob, fileName);
      toast.success('Izveštaj je preuzet.');
    },
    onError: (error) => {
      toast.error('Izveštaj nije izvezen.', { description: getApiErrorMessage(error) });
    },
  });

export type { FinanceExportParams };
