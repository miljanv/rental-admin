'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchAbsenceAttestations } from '@/features/absence-attestations/api/absence-attestations-api';
import { queryKeys } from '@/lib/query-keys';

export const useAbsenceAttestations = (driverId: string) =>
  useQuery({
    queryKey: queryKeys.drivers.absenceAttestations(driverId),
    queryFn: ({ signal }) => fetchAbsenceAttestations(driverId, signal),
    enabled: driverId.length > 0,
  });
