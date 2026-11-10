'use client';

import type { DriverReportWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { submitPortalReport } from '@/features/driver-portal/api/driver-portal-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useSubmitPortalReport = (token: string, tripId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: DriverReportWriteRequest) => submitPortalReport(token, tripId, body),
    onSuccess: async (result) => {
      toast.success('Podaci su poslati.');

      for (const warning of result.warnings) {
        toast.warning('Proverite kilometražu', { description: warning, duration: 10_000 });
      }

      queryClient.setQueryData(queryKeys.driverPortal.trip(token, tripId), result.trip);
      await queryClient.invalidateQueries({ queryKey: queryKeys.driverPortal.trips(token) });
    },
    onError: (error) => {
      toast.error('Podaci nisu poslati.', { description: getApiErrorMessage(error) });
    },
  });
};
