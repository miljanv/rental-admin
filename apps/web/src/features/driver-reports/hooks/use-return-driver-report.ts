'use client';

import type { ReturnDriverReportRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { returnDriverReport } from '@/features/driver-reports/api/driver-reports-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useReturnDriverReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReturnDriverReportRequest }) =>
      returnDriverReport(id, body),
    onSuccess: async () => {
      toast.success('Unos je vraćen vozaču.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.driverReports.all });
    },
    onError: (error) => {
      toast.error('Unos nije vraćen.', { description: getApiErrorMessage(error) });
    },
  });
};
