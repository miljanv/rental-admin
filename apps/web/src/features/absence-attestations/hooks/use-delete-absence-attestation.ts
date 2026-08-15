'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deleteAbsenceAttestation } from '@/features/absence-attestations/api/absence-attestations-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useDeleteAbsenceAttestation = (driverId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { attestationId: string }) =>
      deleteAbsenceAttestation(driverId, variables.attestationId),
    onSuccess: async () => {
      toast.success('Potvrda o odsustvu je obrisana.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.files.all });
    },
    onError: (error) => {
      toast.error('Potvrda nije obrisana.', { description: getApiErrorMessage(error) });
    },
  });
};
