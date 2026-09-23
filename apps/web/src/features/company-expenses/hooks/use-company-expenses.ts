'use client';

import { useQuery } from '@tanstack/react-query';

import {
  fetchCompanyExpenses,
  fetchVehicleCompanyExpenses,
} from '@/features/company-expenses/api/company-expenses-api';
import { queryKeys, type CompanyExpenseListQueryParams } from '@/lib/query-keys';

export const useCompanyExpenses = (params?: CompanyExpenseListQueryParams) =>
  useQuery({
    queryKey: queryKeys.companyExpenses.list(params),
    queryFn: ({ signal }) => fetchCompanyExpenses(params, signal),
    placeholderData: (previous) => previous,
  });

export const useVehicleCompanyExpenses = (
  vehicleId: string,
  params?: CompanyExpenseListQueryParams,
) =>
  useQuery({
    queryKey: queryKeys.companyExpenses.vehicleList(vehicleId, params),
    queryFn: ({ signal }) => fetchVehicleCompanyExpenses(vehicleId, params, signal),
    enabled: vehicleId.length > 0,
    placeholderData: (previous) => previous,
  });
