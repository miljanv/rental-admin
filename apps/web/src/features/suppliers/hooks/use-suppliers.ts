'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchSuppliers } from '@/features/suppliers/api/suppliers-api';
import { queryKeys, type SupplierListQueryParams } from '@/lib/query-keys';

export const useSuppliers = (params: SupplierListQueryParams) =>
  useQuery({
    queryKey: queryKeys.suppliers.list(params),
    queryFn: ({ signal }) => fetchSuppliers(params, signal),
    placeholderData: (previous) => previous,
  });
