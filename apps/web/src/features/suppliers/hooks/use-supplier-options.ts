'use client';

import { useMemo } from 'react';

import { useCompanyExpenseSuppliers } from '@/features/company-expenses/hooks/use-company-expense-suppliers';
import { useFuelSuppliers } from '@/features/fuel-logs/hooks/use-fuel-suppliers';
import { useSuppliers } from '@/features/suppliers/hooks/use-suppliers';
import { sortAlphabetically } from '@/lib/sort-options';

export const useSupplierOptions = () => {
  const suppliersQuery = useSuppliers({
    page: 1,
    limit: 100,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const companySuppliersQuery = useCompanyExpenseSuppliers();
  const fuelSuppliersQuery = useFuelSuppliers();

  return useMemo(
    () =>
      sortAlphabetically(
        [
          ...new Set([
            ...(suppliersQuery.data?.suppliers ?? []).map((supplier) => supplier.name),
            ...(companySuppliersQuery.data ?? []),
            ...(fuelSuppliersQuery.data ?? []),
          ]),
        ].filter((supplier) => supplier.trim().length > 0),
        (supplier) => supplier,
      ),
    [companySuppliersQuery.data, fuelSuppliersQuery.data, suppliersQuery.data?.suppliers],
  );
};
