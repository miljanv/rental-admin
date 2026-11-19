'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { sendPortalAssignment } from '@/features/driver-portal/api/driver-portal-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

const SUCCESS = {
  confirm: 'Zaduženje je potvrđeno.',
  'accept-advance': 'Akontacija je prihvaćena.',
} as const;

/** Confirms the assignment or accepts the advance of one trip. */
export const usePortalAssignment = (token: string, tripId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (action: 'confirm' | 'accept-advance') =>
      sendPortalAssignment(token, tripId, action),
    onSuccess: async (trip, action) => {
      toast.success(SUCCESS[action]);
      queryClient.setQueryData(queryKeys.driverPortal.trip(token, tripId), trip);
      await queryClient.invalidateQueries({ queryKey: queryKeys.driverPortal.trips(token) });
    },
    onError: (error) => {
      toast.error('Nije sačuvano.', { description: getApiErrorMessage(error) });
    },
  });
};
