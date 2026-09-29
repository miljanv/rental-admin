'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchSupplier } from '@/features/suppliers/api/suppliers-api';
import { queryKeys } from '@/lib/query-keys';

export const useSupplier = (id: string) =>
  useQuery({
    queryKey: queryKeys.suppliers.detail(id),
    queryFn: ({ signal }) => fetchSupplier(id, signal),
    enabled: id.length > 0,
  });
