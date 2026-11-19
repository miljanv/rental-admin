'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchPortalMe } from '@/features/driver-portal/api/driver-portal-api';
import { isDriverLinkInvalid } from '@/features/driver-portal/lib/portal';
import { queryKeys } from '@/lib/query-keys';

export const usePortalMe = (token: string) =>
  useQuery({
    queryKey: queryKeys.driverPortal.me(token),
    queryFn: ({ signal }) => fetchPortalMe(token, signal),
    staleTime: 5 * 60_000,
    retry: (failureCount, error) => !isDriverLinkInvalid(error) && failureCount < 2,
  });
