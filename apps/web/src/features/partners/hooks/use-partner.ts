'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchPartner } from '@/features/partners/api/partners-api';
import { queryKeys } from '@/lib/query-keys';

export const usePartner = (id: string) =>
  useQuery({
    queryKey: queryKeys.partners.detail(id),
    queryFn: ({ signal }) => fetchPartner(id, signal),
    enabled: id.length > 0,
  });
