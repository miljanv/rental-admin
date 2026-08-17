'use client';

import type { TripBillingDocumentType } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  generatePredracun,
  generateRacun,
} from '@/features/trip-billing-documents/api/trip-billing-documents-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

const GENERATORS = { PREDRACUN: generatePredracun, RACUN: generateRacun } as const;

export const useGenerateTripBillingDocument = (tripId: string, type: TripBillingDocumentType) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => GENERATORS[type](tripId),
    onSuccess: async (result) => {
      toast.success('PDF je generisan.', { description: result.fileName });
      await queryClient.invalidateQueries({ queryKey: queryKeys.trips.billingDocuments(tripId) });
      window.location.assign(result.downloadUrl);
    },
    onError: (error) => {
      toast.error('PDF nije generisan.', { description: getApiErrorMessage(error) });
    },
  });
};
