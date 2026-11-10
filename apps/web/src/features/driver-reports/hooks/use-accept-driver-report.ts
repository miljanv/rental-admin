'use client';

import type { AcceptDriverReportRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { acceptDriverReport } from '@/features/driver-reports/api/driver-reports-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useAcceptDriverReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AcceptDriverReportRequest }) =>
      acceptDriverReport(id, body),
    onSuccess: async () => {
      toast.success('Odluke su sačuvane.', {
        description: 'Prihvaćeni troškovi su dodati na vožnju.',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.driverReports.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.trips.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      ]);
    },
    onError: (error) => {
      toast.error('Odluke nisu sačuvane.', { description: getApiErrorMessage(error) });
    },
  });
};
