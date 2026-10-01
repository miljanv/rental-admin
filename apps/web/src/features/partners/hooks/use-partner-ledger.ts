'use client';

import type { PartnerLedgerQuery } from '@rental-admin/shared';
import { useQuery } from '@tanstack/react-query';

import { fetchPartnerLedger } from '@/features/partners/api/partners-api';
import { queryKeys } from '@/lib/query-keys';

export const usePartnerLedger = (id: string, params: PartnerLedgerQuery) =>
  useQuery({
    queryKey: queryKeys.partners.ledger(id, params),
    queryFn: ({ signal }) => fetchPartnerLedger(id, params, signal),
  });
