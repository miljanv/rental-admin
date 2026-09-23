'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchCompanyExpenseSuppliers } from '@/features/company-expenses/api/company-expenses-api';
import { queryKeys } from '@/lib/query-keys';

export const useCompanyExpenseSuppliers = () =>
  useQuery({
    queryKey: queryKeys.companyExpenses.suppliers(),
    queryFn: ({ signal }) => fetchCompanyExpenseSuppliers(signal),
    placeholderData: (previous) => previous,
  });
