'use client';

import type { SupplierLedgerQuery } from '@rental-admin/shared';
import { useQuery } from '@tanstack/react-query';

import { fetchSupplierLedger } from '@/features/suppliers/api/suppliers-api';
import { queryKeys } from '@/lib/query-keys';

export const useSupplierLedger = (id: string, params: SupplierLedgerQuery) =>
  useQuery({
    queryKey: queryKeys.suppliers.ledger(id, params),
    queryFn: ({ signal }) => fetchSupplierLedger(id, params, signal),
    enabled: id.length > 0,
  });
