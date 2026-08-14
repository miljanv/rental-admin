'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchDriverDocuments } from '@/features/driver-documents/api/driver-documents-api';
import { queryKeys } from '@/lib/query-keys';

export const useDriverDocuments = (driverId: string) =>
  useQuery({
    queryKey: queryKeys.drivers.documents(driverId),
    queryFn: ({ signal }) => fetchDriverDocuments(driverId, signal),
    enabled: driverId.length > 0,
  });
