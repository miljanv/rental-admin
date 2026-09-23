'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchCompanyExpenseSummary } from '@/features/company-expenses/api/company-expenses-api';
import { queryKeys, type CompanyExpenseSummaryParams } from '@/lib/query-keys';

export const useCompanyExpenseSummary = (params?: CompanyExpenseSummaryParams) =>
  useQuery({
    queryKey: queryKeys.companyExpenses.summary(params),
    queryFn: ({ signal }) => fetchCompanyExpenseSummary(params, signal),
    placeholderData: (previous) => previous,
  });
