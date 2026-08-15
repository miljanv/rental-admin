'use client';

import type { GenerateAbsenceAttestationRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { generateAbsenceAttestation } from '@/features/absence-attestations/api/absence-attestations-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useGenerateAbsenceAttestation = (driverId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: GenerateAbsenceAttestationRequest) =>
      generateAbsenceAttestation(driverId, body),
    onSuccess: async (result) => {
      toast.success('Potvrda o odsustvu je generisana.');
      window.location.assign(result.downloadUrl);
      await queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.files.all });
    },
    onError: (error) => {
      toast.error('Potvrda nije generisana.', { description: getApiErrorMessage(error) });
    },
  });
};
