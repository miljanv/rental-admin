'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchPartners } from '@/features/partners/api/partners-api';
import { queryKeys, type PartnerListQueryParams } from '@/lib/query-keys';

export const usePartners = (params: PartnerListQueryParams) =>
  useQuery({
    queryKey: queryKeys.partners.list(params),
    queryFn: ({ signal }) => fetchPartners(params, signal),
    placeholderData: (previous) => previous,
  });
