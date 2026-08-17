'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchTripBillingDocuments } from '@/features/trip-billing-documents/api/trip-billing-documents-api';
import { queryKeys } from '@/lib/query-keys';

export const useTripBillingDocuments = (tripId: string) =>
  useQuery({
    queryKey: queryKeys.trips.billingDocuments(tripId),
    queryFn: () => fetchTripBillingDocuments(tripId),
    enabled: Boolean(tripId),
  });
